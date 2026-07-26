import { test as setup } from "@playwright/test";
import fs from "fs";
import path from "path";

const authFile = "e2e/.auth/user.json";

setup("authenticate and save state", async ({ page }) => {
  const dir = path.dirname(authFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Set up authenticated storageState for reused auth session
  const authData = {
    cookies: [],
    origins: [
      {
        origin: "http://localhost:3000",
        localStorage: [
          { name: "token", value: "test-auth-token" },
          {
            name: "user",
            value: JSON.stringify({
              id: "user-123",
              email: "member@example.com",
              role: "MEMBER",
            }),
          },
        ],
      },
    ],
  };
  fs.writeFileSync(authFile, JSON.stringify(authData, null, 2));
});
