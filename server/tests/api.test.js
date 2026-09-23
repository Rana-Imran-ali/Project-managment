const http = require("http");
const mongoose = require("mongoose");
const path = require("path");
const dotenv = require("dotenv");

// Ensure environment is set
process.env.NODE_ENV = "test";
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config();

const app = require("../src/server");

// Helper function to make HTTP requests against the app without external dependencies
function request(server, options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port: server.address().port,
        method: options.method || "GET",
        path: options.path,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
      },
      (res) => {
        let rawData = "";
        res.on("data", (chunk) => {
          rawData += chunk;
        });
        res.on("end", () => {
          let data = rawData;
          try {
            data = JSON.parse(rawData);
          } catch (e) {
            // Keep as string if not JSON
          }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
          });
        });
      }
    );

    req.on("error", (e) => reject(e));

    if (body) {
      req.write(typeof body === "string" ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log("=========================================");
  console.log(" Starting API Tests Verification Suite   ");
  console.log("=========================================\n");

  // Wait for mongoose to connect if it is connecting
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
  }

  // Start temporary HTTP server on ephemeral port (0)
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  console.log(`Test server running on port ${address.port}\n`);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(` [PASS] ${message}`);
      passed++;
    } else {
      console.error(` [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Root health check
    const rootRes = await request(server, { method: "GET", path: "/" });
    assert(rootRes.statusCode === 200, "GET / returns 200 OK");
    assert(
      rootRes.body && rootRes.body.message === "Project Management API is working!",
      "GET / returns correct health message"
    );

    // 2. 404 handler for unknown route
    const notFoundRes = await request(server, {
      method: "GET",
      path: "/api/unknown-endpoint-xyz",
    });
    assert(
      notFoundRes.statusCode === 404,
      "Unknown route returns 404 Not Found"
    );

    // 3. Register user with missing fields
    const regMissingRes = await request(
      server,
      { method: "POST", path: "/api/auth/register" },
      { name: "John" }
    );
    assert(
      regMissingRes.statusCode === 400,
      "POST /api/auth/register rejects missing email/password with 400 Bad Request"
    );

    // 4. Register a valid user
    const testEmail = `test_${Date.now()}@example.com`;
    const regRes = await request(
      server,
      { method: "POST", path: "/api/auth/register" },
      {
        name: "Test User",
        email: testEmail,
        password: "Password123!",
        role: "manager",
      }
    );
    assert(
      regRes.statusCode === 201,
      "POST /api/auth/register creates user with 201 Created"
    );
    assert(
      typeof regRes.body.token === "string" && regRes.body.token.length > 20,
      "POST /api/auth/register returns a valid JWT token"
    );
    assert(
      regRes.body.user && regRes.body.user.email === testEmail,
      "POST /api/auth/register returns correct user profile"
    );

    const userId = regRes.body.user.id;

    // 5. Register duplicate email
    const regDupRes = await request(
      server,
      { method: "POST", path: "/api/auth/register" },
      {
        name: "Duplicate User",
        email: testEmail,
        password: "Password123!",
      }
    );
    assert(
      regDupRes.statusCode === 400,
      "POST /api/auth/register rejects duplicate email with 400 Bad Request"
    );

    // 6. Login user with wrong password
    const loginWrongRes = await request(
      server,
      { method: "POST", path: "/api/auth/login" },
      { email: testEmail, password: "WrongPassword" }
    );
    assert(
      loginWrongRes.statusCode === 401,
      "POST /api/auth/login rejects wrong password with 401 Unauthorized"
    );

    // 7. Login user with correct credentials
    const loginRes = await request(
      server,
      { method: "POST", path: "/api/auth/login" },
      { email: testEmail, password: "Password123!" }
    );
    assert(
      loginRes.statusCode === 200,
      "POST /api/auth/login logs in successfully with 200 OK"
    );
    assert(
      typeof loginRes.body.token === "string" && loginRes.body.token.length > 20,
      "POST /api/auth/login returns a valid JWT token"
    );

    const authHeaders = { Authorization: `Bearer ${loginRes.body.token}` };

    // 7b. Create project without auth header returns 401 Unauthorized
    const unauthProjectRes = await request(
      server,
      { method: "POST", path: "/api/projects" },
      { name: "Unauthorized Project" }
    );
    assert(
      unauthProjectRes.statusCode === 401,
      "POST /api/projects without token returns 401 Unauthorized"
    );

    // 7c. Create project with member token returns 403 Forbidden
    const memberProjectRes = await request(
      server,
      { method: "POST", path: "/api/projects", headers: authHeaders },
      { name: "Unauthorized Member Project" }
    );
    assert(
      memberProjectRes.statusCode === 403,
      "POST /api/projects rejects non-admin member with 403 Forbidden"
    );

    // Promote test user to admin for admin-only project endpoints
    const User = require("../src/models/User");
    await User.findByIdAndUpdate(userId, { role: "admin" });

    // Re-login to get admin JWT token with role 'admin'
    const adminLoginRes = await request(
      server,
      { method: "POST", path: "/api/auth/login" },
      { email: testEmail, password: "Password123!" }
    );
    const adminHeaders = { Authorization: `Bearer ${adminLoginRes.body.token}` };

    // 8. Create project with invalid member ID (should return 400, NOT crash with 500)
    const invalidMemberRes = await request(
      server,
      { method: "POST", path: "/api/projects", headers: adminHeaders },
      { name: "Test Project", members: ["not_a_valid_mongo_id"] }
    );
    assert(
      invalidMemberRes.statusCode === 400,
      "POST /api/projects rejects invalid member ID with 400 Bad Request (not 500)"
    );

    // 9. Create project with valid admin credentials
    const createProjRes = await request(
      server,
      { method: "POST", path: "/api/projects", headers: adminHeaders },
      {
        name: "Alpha Project",
        description: "A test project",
        owner: userId,
        status: "in_progress",
      }
    );
    assert(
      createProjRes.statusCode === 201,
      "POST /api/projects creates project with 201 Created for admin"
    );
    const projectId = createProjRes.body.project._id;

    // 10. Get all projects
    const getProjectsRes = await request(server, {
      method: "GET",
      path: "/api/projects",
      headers: adminHeaders,
    });
    assert(
      getProjectsRes.statusCode === 200,
      "GET /api/projects returns 200 OK"
    );
    assert(
      Array.isArray(getProjectsRes.body.projects),
      "GET /api/projects returns an array of projects"
    );

    // 11. Get single project with malformed ID (should return 400, NOT crash with 500)
    const getMalformedRes = await request(server, {
      method: "GET",
      path: "/api/projects/123-invalid-id",
      headers: adminHeaders,
    });
    assert(
      getMalformedRes.statusCode === 400,
      "GET /api/projects/:id returns 400 Bad Request for malformed ID (not 500)"
    );

    // 12. Get single project with valid ID
    const getProjectRes = await request(server, {
      method: "GET",
      path: `/api/projects/${projectId}`,
      headers: adminHeaders,
    });
    assert(
      getProjectRes.statusCode === 200,
      "GET /api/projects/:id returns 200 OK for existing project"
    );
    assert(
      getProjectRes.body.project.name === "Alpha Project",
      "GET /api/projects/:id returns correct project data"
    );

    // 13. Update project with malformed ID (returns 400)
    const updateMalformedRes = await request(
      server,
      { method: "PUT", path: "/api/projects/invalid_id", headers: adminHeaders },
      { name: "Updated Name" }
    );
    assert(
      updateMalformedRes.statusCode === 400,
      "PUT /api/projects/:id returns 400 Bad Request for malformed ID"
    );

    // 14. Update project with valid ID
    const updateRes = await request(
      server,
      { method: "PUT", path: `/api/projects/${projectId}`, headers: adminHeaders },
      { name: "Alpha Project Updated", status: "completed" }
    );
    assert(
      updateRes.statusCode === 200,
      "PUT /api/projects/:id updates project with 200 OK"
    );
    assert(
      updateRes.body.project.name === "Alpha Project Updated",
      "PUT /api/projects/:id returns updated project name"
    );

    // 15. Delete project with malformed ID (returns 400)
    const deleteMalformedRes = await request(server, {
      method: "DELETE",
      path: "/api/projects/invalid_id",
      headers: adminHeaders,
    });
    assert(
      deleteMalformedRes.statusCode === 400,
      "DELETE /api/projects/:id returns 400 Bad Request for malformed ID"
    );

    // 16. Delete project with valid ID
    const deleteRes = await request(server, {
      method: "DELETE",
      path: `/api/projects/${projectId}`,
      headers: adminHeaders,
    });
    assert(
      deleteRes.statusCode === 200,
      "DELETE /api/projects/:id deletes project with 200 OK"
    );

    // 17. Clean up created test user and close
    await User.findByIdAndDelete(userId);

    console.log("\n=========================================");
    console.log(` Summary: ${passed} passed, ${failed} failed `);
    console.log("=========================================\n");

    if (failed > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error("Test execution encountered an error:", err);
    process.exitCode = 1;
  } finally {
    server.close();
    await mongoose.connection.close();
  }
}

runTests();
