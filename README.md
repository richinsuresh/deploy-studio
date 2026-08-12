# Deploy Studio

A tiny website that lets you push an HTML file to Vercel with no terminal —
just a website name, a file picker, and a button. It also shows every site
you've deployed through it.

## One-time setup (you do this, ~10 minutes, no coding)

### 1. Get a Vercel API token
1. Go to https://vercel.com/account/tokens
2. Click **Create Token**, name it anything (e.g. "deploy-studio"), no expiry needed
3. Copy the token — you'll only see it once

### 2. Push this project to GitHub
1. Go to https://github.com/new, create a new **private** repo (e.g. `deploy-studio`)
2. Upload all the files in this folder to that repo (GitHub's web UI has an
   "upload files" button — drag the whole folder in, no git commands needed)

### 3. Import it into Vercel
1. Go to https://vercel.com/new
2. Select the `deploy-studio` repo you just created
3. Before clicking Deploy, open **Environment Variables** and add:
   - `VERCEL_TOKEN` → the token from step 1
   - `APP_PASSCODE` → any simple password you and your dad will remember
   - `VERCEL_TEAM_ID` → leave blank unless your Vercel account is a Team account
4. Click **Deploy**

That's it. Vercel gives you a URL like `deploy-studio.vercel.app` — bookmark
that for your dad. From now on, deploying a new site is just:

1. Open the bookmarked page
2. Type a site name
3. Choose the HTML file
4. Type the passcode
5. Click "Push to Vercel" → get the live link instantly
6. Every past deployment shows in the list below

## Notes
- Supports any file types — HTML, CSS, JS, images, fonts, etc. You can
  drag a whole folder in, or use "Choose folder" / "Choose files" to pick
  multiple files at once. If none of the files is named `index.html`, the
  app automatically picks the first `.html` file it finds and uses that as
  the homepage.
- The passcode is a light deterrent, not real security — anyone with the
  passcode can create deployments on your Vercel account. Fine for family use,
  don't share the URL publicly.
- Each deployment becomes its own small Vercel project under your account, so
  the deployment list will keep growing — that's normal and free on Vercel's
  hobby plan within its usage limits.
- Total upload size per deployment should stay well under a few MB — this is
  meant for simple sites, not large media libraries.
