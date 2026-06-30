# Deployment Guide for Sugandh Mart Ledger System

This guide provides step-by-step instructions for deploying the **Node.js/Express backend on an AWS EC2 instance** and the **Vue frontend on Vercel**.

## Phase 1: Initialize AWS EC2
1. **Log in to AWS Console:** Go to the AWS Management Console and navigate to the **EC2 Dashboard**.
2. **Launch Instance:** Click the **Launch instances** button.
3. **Name and OS:** 
   - Enter a name for your instance (e.g., `sugandh-mart-server`).
   - Select **Ubuntu** under "Quick Start" and choose **Ubuntu Server 22.04 LTS** or **24.04 LTS** (Free tier eligible).
4. **Instance Type:** Select **t2.micro** (if you want to stay in the free tier) or higher depending on your load.
5. **Key Pair:**
   - Click **Create new key pair**.
   - Name it (e.g., `sm-server-key`), keep the type as **RSA**, and format as **.pem**. 
   - Click **Create key pair** and the `.pem` file will download to your computer. **Keep this safe!**
6. **Network Settings:**
   - Make sure **Allow SSH traffic** is checked (Port 22).
   - Check **Allow HTTP traffic from the internet** (Port 80).
   - Check **Allow HTTPS traffic from the internet** (Port 443).
7. **Storage:** 8 GB of `gp2` or `gp3` storage is enough, but you can increase it to up to 30 GB (Free tier max).
8. **Launch:** Click **Launch instance** in the bottom right.

---

## Phase 2: Connect to the EC2 Instance
1. Open your terminal where the `.pem` file was downloaded.
2. Change the permissions of your key file so it is not publicly viewable:
   ```bash
   chmod 400 sm-server-key.pem
   ```
3. Connect using SSH (replace `<your-instance-public-ip>` with the actual public IP address of your EC2 instance):
   ```bash
   ssh -i "sm-server-key.pem" ubuntu@<your-instance-public-ip>
   ```

---

## Phase 3: Install Server Dependencies (Node.js, Git, PM2, Nginx)
Once logged into your EC2 terminal, run the following commands sequentially to set up your environment.

1. **Update system packages:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```
2. **Install Node.js (v20):**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   ```
3. **Verify Installation:**
   ```bash
   node -v  # Should output v20.x.x
   npm -v   # Should output the npm version
   ```
4. **Install PM2 (Process Manager) and Nginx:**
   ```bash
   sudo npm install -g pm2
   sudo apt install nginx git -y
   ```

---

## Phase 4: Deploy the Code
1. **Clone your repository:**
   *(If your repository is private, you will need to generate an SSH key on the EC2 instance using `ssh-keygen` and add it to your GitHub/GitLab account, or use a Personal Access Token).*
   ```bash
   git clone <YOUR_GITHUB_REPOSITORY_URL> sm_emal_system
   cd sm_emal_system
   ```

2. **Build the Frontend (Vue):**
   ```bash
   cd frontend
   npm install
   npm run build
   ```
   *(This creates the `frontend/dist` folder which is required by your backend's `express.static()` middleware).*

3. **Set up the Backend (Node.js):**
   ```bash
   cd ../backend
   npm install
   ```

4. **Configure Environment Variables:**
   Create an `.env` file in your `backend` directory.
   ```bash
   nano .env
   ```
   Paste in your environment variables. Make sure to update `BASE_URL` to your actual EC2 public IP or domain name:
   ```env
   PORT=3000
   BASE_URL=http://<your-instance-public-ip>
   DATABASE_URL=postgresql://neondb_owner:... # (Your neon DB connection string)
   
   GMAIL_USER=playedit.space@gmail.com
   GMAIL_APP_PASSWORD=imoq sjnz tcvh ucew
   
   EMAIL_SFNF=galahitanshu@gmail.com 
   EMAIL_SIPL=dalviomkar0901@gmail.com
   EMAIL_SADVIK=dalviomkar0901@gmail.com
   EMAIL_ALEITR=galahitanshu@gmail.com 
   EMAIL_SM=galahitanshu@gmail.com
   ADMIN_PIN=1234
   ```
   *Press `Ctrl + O` to save, `Enter` to confirm, and `Ctrl + X` to exit Nano.*

5. **Start the Backend Server using PM2:**
   ```bash
   pm2 start server.js --name "sm-backend"
   ```
6. **Ensure PM2 restarts on server reboot:**
   ```bash
   pm2 startup ubuntu
   ```
   *(Run the exact command that PM2 outputs on your screen)*, then:
   ```bash
   pm2 save
   ```

---

## Phase 5: Configure Nginx Reverse Proxy
Instead of exposing port 3000, we will use Nginx to map standard HTTP port (80) to your backend running on 3000.

1. **Remove default Nginx config:**
   ```bash
   sudo rm /etc/nginx/sites-enabled/default
   ```
2. **Create a new configuration file:**
   ```bash
   sudo nano /etc/nginx/sites-available/sm-app
   ```
3. **Paste the following configuration** (replace `<your-instance-public-ip>` with your actual IP or Domain):
   ```nginx
   server {
       listen 80;
       server_name <your-instance-public-ip>; # or your domain name

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
4. **Enable the configuration:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/sm-app /etc/nginx/sites-enabled/
   ```
5. **Test and restart Nginx:**
   ```bash
   sudo nginx -t
   sudo systemctl restart nginx
   ```

---

## Phase 6: Deploy the Frontend to Vercel

With the backend securely running on AWS, you will deploy the frontend to Vercel for high performance and global CDN distribution.

1. **Push your code to GitHub/GitLab:** Make sure your `frontend` directory contains the `vercel.json` file provided in the repository.
2. **Log into Vercel:** Go to [vercel.com](https://vercel.com) and click **Add New Project**.
3. **Import Repository:** Select your Git repository containing the `sm_emal_system` codebase.
4. **Configure Project:**
   - **Framework Preset:** Select **Vite** (or Vue).
   - **Root Directory:** Click Edit and select the `frontend` folder (this is crucial).
5. **Update AWS IP:** In `frontend/vercel.json`, make sure you have replaced `YOUR_EC2_PUBLIC_IP` with your actual EC2 public IP address before pushing, or edit it directly.
6. **Deploy:** Click **Deploy**. Vercel will automatically build the site and deploy it to a free `https://your-project.vercel.app` domain. 

### Why Vercel?
- **No Custom Domain Needed:** Vercel gives you a free SSL-secured domain out of the box.
- **Reverse Proxy Security:** The `vercel.json` rewrites act as a reverse proxy. Your users only communicate with Vercel's secure domain, while Vercel's backend servers securely communicate with your AWS EC2 instance. The AWS IP remains hidden from the public!
- **No Mixed Content Errors:** Because Vercel proxies the API calls under the hood, your secure Vercel frontend never technically makes a direct HTTP call to your unsecure AWS IP, completely bypassing browser mixed-content restrictions.
