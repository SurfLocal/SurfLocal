# Networking Configurations

## Installing the OS and Establishing Hostnames

1. **Install Raspberry Pi Imager and OS:**

   - Download the Raspberry Pi Imager from [https://www.raspberrypi.org/software/](https://www.raspberrypi.org/software/).
   - Insert the SanDisk 32GB microSD card into your computer.
   - Open the Raspberry Pi Imager:
     1. **Choose Device:** Select your Raspberry Pi model (e.g., Raspberry Pi 4)
     2. **Choose OS:** Select "Raspberry Pi OS (64-bit)" (recommended)
     3. **Choose Storage:** Select your microSD card
     4. Click **"Next"**
   
   - When prompted "Would you like to apply OS customisation settings?", click **"Edit Settings"**
   
   - **GENERAL Tab:**
     - ✅ **Set hostname:** Leave UNCHECKED (the boot_pi.sh script will set this)
     - ✅ **Set username and password:** CHECK THIS
       - Username: `pi`
       - Password: Choose a secure password (remember this - you'll need it once)
     - ✅ **Configure wireless LAN:** CHECK THIS if using WiFi
       - SSID: Your WiFi network name
       - Password: Your WiFi password
       - Wireless LAN country: Your country code (e.g., US)
     - ✅ **Set locale settings:** CHECK THIS
       - Time zone: Your timezone
       - Keyboard layout: Your keyboard layout
   
   - **SERVICES Tab:**
     - ✅ **Enable SSH:** CHECK THIS
     - Select "Use password authentication"
   
   - Click **"Save"**, then **"Yes"** to apply customization settings
   - When prompted that all existing data will be erased, click **"Yes"** to continue
   - Wait for the OS to flash and verify (this takes a few minutes)

2. **Run the `boot_pi.sh` Script for Each Node:**

   - After flashing the OS, remove and reinsert the microSD card into your computer.

   - Add execution privileges for the script (first time only):
     ```bash
     chmod +x boot_pi.sh
     ```
   
   - Execute the `boot_pi.sh` script with the desired hostname:

      ```bash
      ./boot_pi.sh <hostname>
      ```
      
      Example hostnames: `master`, `worker1`, `worker2`, `postgres`
    
   **What this script does:**
   - Detects and mounts the Raspberry Pi's SD card (bootfs partition)
   - Enables SSH for remote access
   - Creates a firstrun script that sets the hostname on first boot
   - The Pi will automatically reboot after first boot to apply the hostname
   
   After the script completes, remove the microSD card and insert it into the Raspberry Pi.

3. **Run the `init_host.sh` Script for Each Node:**
   
   After inserting the microSD card into the Raspberry Pi and powering it on, wait 2-3 minutes for the initial boot and hostname configuration (the Pi will reboot once automatically).

   - Add execution privileges for the script (first time only):
     ```bash
     chmod +x init_host.sh
     ```

   - Execute the `init_host.sh` script:

     ```bash
     ./init_host.sh <hostname>
     ```
    
   **What this script does:**
   - Waits for the Pi to come online (tries mDNS first, falls back to network scan)
   - Automatically finds the Pi's IP address by scanning for Raspberry Pi devices
   - Adds the hostname to your local `/etc/hosts` file for easy access
   - Copies your SSH key to the Pi (you'll be prompted for the password you set in Imager)
   - Configures SSH security: disables password authentication and enables key-only login
   - Updates your local `~/.ssh/config` for simplified SSH access
   
   **You will be prompted once for:**
   - Your sudo password (to update `/etc/hosts`)
   - The Pi's password (the one you set in Raspberry Pi Imager)
   
   After completion, you can connect with: `ssh <hostname>` (e.g., `ssh master`)
   
4. **Verify SSH Access:**

   Test that you can connect without a password:
   ```bash
   ssh <hostname>
   ```
   
   You should be logged in immediately without any password prompt.

5. **Security Enhancements Included in the `init_host.sh` Script:**

- SSH Key Generation: The script checks if an SSH key already exists in your home directory. If not, it generates one to facilitate secure SSH connections.

- Disabling Password Authentication for SSH: The script modifies the SSH configuration to disable password-based authentication and challenge-response authentication methods, forcing the use of SSH keys for login.

- Limiting SSH Authentication Attempts: To mitigate brute-force attacks, the script also limits the number of authentication attempts to 3.

6. **Next Steps: Configuring Ansible for Deployment:**

Now that each Raspberry Pi is accessible by its assigned hostname, we can proceed with using Ansible for automated deployment. With passwordless SSH authentication established, Ansible can seamlessly connect to the nodes, execute tasks, and manage configurations across the cluster. The next step is to set up Ansible and use the provided playbooks for deploying and managing services on the Raspberry Pi cluster.

## Configure DNS Routing

### Setting up NAT on your WiFi Router

For an AT&T router, you can enable port forwarding and NAT by following these steps:

1. **Log in to Your AT&T Router**

Open a web browser and go to http://192.168.1.254 (the default gateway for most AT&T routers). Enter your Device Access Code (printed on your router, usually on a sticker), then click Login.

2. **Navigate to Port Forwarding / NAT**

In the router interface, go to Firewall > NAT/Gaming, then click Custom Services to manually add a new port forwarding rule.

3. **Add a Port Forwarding Rule**

Click Add a new user-defined application, enter a name for the rule (e.g., SSH, WebServer, etc.), and select the protocol (TCP, UDP, or both). Enter the port range (e.g., 22 for SSH, 80 for HTTP, 443 for HTTPS), set the Base Host Port (use the same port number), and click Add to List. For our purposes, we are configuring port 2222 as a non-standard SSH port for our remote DNS access.

4. **Assign the Port to Your Device**

Go back to NAT/Gaming, find the application you just created in the list, and under Needed by Device, select your device (or enter its local IP manually). Click Add, then Save to apply the settings.


#### Additional Notes

Verify the port is open using an external port check tool like https://canyouseeme.org/.

Ensure you ran the `boot_pi.sh` script which configures a hostname for your Pi. You should configure forwarding based on the hostname not the IP to prevent your Pi from losing forwarding after reboot.

### How to Reserve a DDNS.net DNS Name on No-IP

#### 1. Create a No-IP Account
- Go to [No-IP's website](https://www.noip.com/).
- Click Sign Up and create a free or premium account.
- Verify your email address.

#### 2. Set Up a Free Hostname
- Log in to your No-IP account.
- Navigate to Dynamic DNS > Hostnames.
- Click Create Hostname.
- Enter your desired hostname (e.g., surflocal).
- Select .ddns.net from the available domain options.
- Choose DNS Host (A) as the record type.
- Your public IP address should auto-fill; if not, enter it manually.
- Click Create Hostname.

### No-IP Configuration via Ansible

The Ansible No-IP playbook automates the setup of dynamic DNS (DDNS) using No-IP for the master node and Postgres database. This allows a system with a changing public IP address to be accessible via a consistent domain name. Furthermore, it also allows for the DNS name to be discoverable on the internet once the NAT has been configured on your router.

It installs the No-IP Dynamic Update Client (DUC), configures it to run as a systemd service, and ensures it starts automatically on boot. By periodically updating No-IP’s servers with the current IP address, the system remains reachable under a static hostname, even if its external IP changes.
