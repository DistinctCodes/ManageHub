# Creating GitHub Issues from the Terminal on Windows
### A step-by-step guide using the GitHub CLI (gh) on Windows with WSL
#### By BigBen-7 · Regain+ Build Series

---

## What This Guide Covers

The GitHub CLI (`gh`) lets you create, label, and manage issues directly from your terminal — no browser tab needed. This guide is the **Windows version** of the workflow. It covers every gotcha that does not appear in the Mac guide, learned from real experience running this exact workflow on Windows 10/11 with WSL.

---

## Prerequisites

- A GitHub account
- A repository already created on GitHub
- Windows 10 or Windows 11
- WSL (Windows Subsystem for Linux) installed — if not, run this in PowerShell as Administrator:
  ```powershell
  wsl --install
  ```
- The `gh` CLI installed on **Windows** (not inside WSL — see Step 1)

---

## Step 1 — Install the GitHub CLI on Windows

Do **not** install `gh` inside WSL. Install it on Windows directly.

**Option A — winget (recommended, built into Windows 10/11):**
```cmd
winget install --id GitHub.cli
```

**Option B — Manual installer:**
Download the `.msi` installer from the GitHub CLI releases page and run it.

Verify it installed correctly by opening **Command Prompt** and running:
```cmd
gh --version
```
You should see something like:
```
gh version 2.87.3 (2025-03-01)
```

---

## Step 2 — Log In to GitHub

Run this from **Windows Command Prompt** (not WSL):
```cmd
gh auth login
```

Answer the prompts like this:
- Where do you use GitHub? → **GitHub.com**
- What is your preferred protocol? → **HTTPS**
- Authenticate Git with your GitHub credentials? → **Yes**
- How would you like to authenticate? → **Login with a web browser**

The CLI will print a one-time code and open a browser tab. Paste the code, click Authorize, and return to the terminal. You will see:
```
✓ Authentication complete.
✓ Logged in as YOUR-USERNAME
```

> **Important:** Always authenticate from Windows CMD — not from inside WSL. The login session is stored on the Windows side where `gh` is installed.

---

## Step 3 — Create the Label First

> ⚠ **The Label Gotcha — Read This Before Creating Issues**
>
> If you use `--label` in your `gh issue create` command and that label does not already exist on the repository, GitHub will silently fail to attach it. The issue appears to create successfully but the label is never applied.
>
> Always create your labels **before** running your issue script.

Create labels from **Windows Command Prompt**:
```cmd
gh label create "backend" --color "5CB87A" --repo YOUR-USERNAME/YOUR-REPO
gh label create "frontend" --color "E8A838" --repo YOUR-USERNAME/YOUR-REPO
gh label create "bug" --color "E05252" --repo YOUR-USERNAME/YOUR-REPO
```

Verify your labels exist:
```cmd
gh label list --repo YOUR-USERNAME/YOUR-REPO
```

---

## Step 4 — Write the Issue Script

Create a file called `create-issues.sh` (e.g., in your project folder or Downloads). Each issue is one `gh.exe issue create` command.

> ⚠ **Windows-Specific Rule: Use `gh.exe` not `gh` in your script**
>
> WSL (where you will run the script) does not have `gh` on its PATH even though it is installed on Windows. You must use `gh.exe` — WSL can call Windows executables using the `.exe` suffix.
>
> If you write `gh` in your script and run it from WSL, every command will silently fail with `gh: command not found`. The echo lines will still print, making it look like everything worked — but nothing was actually created.

Basic structure of the script:
```bash
#!/bin/bash

REPO="YOUR-USERNAME/YOUR-REPO"
LABEL="backend"

gh.exe issue create --repo $REPO \
  --title "[BE-01] Your issue title here" \
  --label "$LABEL" \
  --body "## Overview
Describe the issue here.

## Acceptance Criteria
- [ ] First checkbox
- [ ] Second checkbox"
echo "✓ Issue 1 created"
```

**Tips for writing good issue bodies:**
- Use `##` headings to separate Overview and Acceptance Criteria
- Use `- [ ]` syntax for checkboxes — GitHub renders these as ticks
- Keep the title short and prefixed: `[BE-01]`, `[FE-02]` etc.
- One issue = one feature or bug. Never combine two things.

---

## Step 5 — Fix Line Endings Before Running (Windows-Only Step)

> ⚠ **The CRLF Gotcha — This Will Break Your Script If You Skip It**
>
> Files created or edited on Windows use **CRLF** (`\r\n`) line endings. When WSL's bash reads the file, the hidden `\r` character at the end of each line is treated as part of the command. This breaks multi-line commands (those using `\` to continue onto the next line) and causes errors like:
> ```
> $'\r': command not found
> --title: command not found
> --label: command not found
> ```
> Your script will appear to run (the echo lines print) but every single `gh.exe` command will fail. No issues will be created.

**The fix — run this once in WSL before executing your script:**
```bash
sed -i 's/\r//' /mnt/c/Users/YOUR-USERNAME/path/to/create-issues.sh
```

This converts the file from Windows (CRLF) to Unix (LF) line endings in place. You only need to do this once after creating or editing the file on Windows.

---

## Step 6 — Run the Script

Open WSL (search "WSL" or "Ubuntu" in the Start menu) and run:

```bash
bash /mnt/c/Users/YOUR-USERNAME/Downloads/create-issues.sh
```

> ⚠ **WSL Path Gotcha**
>
> In WSL, `~` resolves to `/home/your-linux-username/` — **not** your Windows user folder.
> Your Windows `C:\` drive is mounted at `/mnt/c/` in WSL.
>
> So `C:\Users\HP\Downloads\SMALDA\create-issues.sh` becomes:
> `/mnt/c/Users/HP/Downloads/SMALDA/create-issues.sh`
>
> Never use `~` or Windows backslash paths when running scripts in WSL.

You will see one confirmation line per issue:
```
✓ Issue 1 created
✓ Issue 2 created
...
✅ All issues created successfully.
```

---

## Step 7 — Verify Everything Landed

List all open issues on your repo from WSL:
```bash
gh.exe issue list --repo YOUR-USERNAME/YOUR-REPO
```

You should see all your issues with their numbers, titles, and labels.

If you forgot to create the label first and need to apply it now:
```bash
# Apply to a single issue
gh.exe issue edit 23 --add-label "backend" --repo YOUR-USERNAME/YOUR-REPO

# Apply to a range of issues (e.g. issues 1 through 40)
for i in {1..40}; do gh.exe issue edit $i --add-label "backend" --repo YOUR-USERNAME/YOUR-REPO; done
```

---

## Windows Quick Reference Cheat Sheet

| Task | Command (run from WSL unless noted) |
|------|--------------------------------------|
| Install gh | `winget install --id GitHub.cli` (Windows CMD) |
| Login | `gh auth login` **(Windows CMD only)** |
| Create a label | `gh.exe label create "name" --color "HEX" --repo USER/REPO` |
| List labels | `gh.exe label list --repo USER/REPO` |
| Fix CRLF before running | `sed -i 's/\r//' /mnt/c/path/to/script.sh` |
| Run your script | `bash /mnt/c/Users/HP/Downloads/script.sh` |
| Create one issue | `gh.exe issue create --repo USER/REPO --title "..." --body "..."` |
| Create with label | `gh.exe issue create --repo USER/REPO --title "..." --label "name" --body "..."` |
| List all issues | `gh.exe issue list --repo USER/REPO` |
| Add label to issue | `gh.exe issue edit 23 --add-label "name" --repo USER/REPO` |
| Close an issue | `gh.exe issue close 23 --repo USER/REPO` |
| View issue in browser | `gh.exe issue view 23 --web --repo USER/REPO` |

---

## Summary of Windows-Only Gotchas

| # | Gotcha | Symptom | Fix |
|---|--------|---------|-----|
| 1 | `gh` not found in WSL | `gh: command not found` for every issue, echo lines still print | Use `gh.exe` in all script commands |
| 2 | CRLF line endings | `$'\r': command not found`, `--title: command not found` | Run `sed -i 's/\r//' script.sh` before executing |
| 3 | Wrong WSL path | `No such file or directory` | Use `/mnt/c/Users/HP/...` not `~/...` |
| 4 | Logging in from WSL | Auth works but `gh.exe` still says not logged in | Always run `gh auth login` from Windows CMD |

---

That's it. Once you have this workflow down, you can script your entire project's issue backlog in minutes and run it on any repo — all from the terminal on Windows.
