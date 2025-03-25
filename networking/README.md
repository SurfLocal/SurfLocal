# Networking Configurations

## Installing the OS and Establishing Hostnames

1. **Install Raspberry Pi Imager and OS:**

   - Download the Raspberry Pi Imager from [https://www.raspberrypi.org/software/](https://www.raspberrypi.org/software/).
   - Insert the SanDisk 32GB microSD card into your computer.
   - Rename the microSD card to `boot`
   - Open the Raspberry Pi Imager and choose the Raspberry Pi OS (64-bit).
   - Select the SD card you inserted.
   - Due to [recent changes](https://www.raspberrypi.com/news/raspberry-pi-bullseye-update-april-2022/), a username and password will have to be provided in order to enable SSH.
   - Click "Next" and configure the host and username with corresponding password in the OS customization menu.
   - When prompted that all existing data will be erased, click "Yes" that you would like to continue.

2. **Run the `boot_pi.sh` Script for Each Node:**

   - After installing the OS, remove and insert the microSD card into your computer again.

   - Add execution privileges for the script:
     ```bash
     chmod +x boot_pi.sh
     ```
   
   - Execute the `boot_pi.sh` script:

      The script is designed to configure the Raspberry Pi with a unique hostname. Run the script, specifying the hostname you want to assign to the Raspberry Pi (e.g., `master`, `worker1`, `postgres`):

      ```bash
      ./boot_pi.sh <hostname>
      ```
    
This script automates the pre-boot configuration of a Raspberry Pi by setting its hostname and enabling SSH. It detects and mounts the Raspberry Pi's SD card, modifies the necessary system files to apply the hostname, and ensures SSH is enabled for remote access. After making these changes, it unmounts the disk and prompts the user to insert the SD card into the Raspberry Pi, streamlining the setup process and eliminating the need for manual configuration after boot.

3. **Run the `init_host.sh` Script for Each Node:**
   
After the above step is complete, you may remove the microSD cards and insert them into the Raspberry Pi's before turning them on. After you allow some time for them to boot and become discoverable on your local network, you may run this script.

   - Add execution privileges for the script:
     ```bash
     chmod +x init_host.sh
     ```

   - Execute the `init_host.sh` script:

     Be sure to replace the hostname parameter with a Pi that has been booted.

     ```bash
     sudo ./init_host.sh <hostname>
     ```
    
Note that you will have to provide the password you setup for Pi during the OS installation phase.

This script automates the setup of secure, passwordless SSH access to a Raspberry Pi or other remote machine. It begins by verifying that a hostname is provided, then checks for an existing SSH key, generating one if necessary. The script updates the local SSH configuration to simplify future connections and offers an option to configure a public DNS hostname. 

It then securely transfers the SSH key to the remote machine and configures the SSH server to disable password authentication, enhancing security. Finally, it verifies that the key transfer was successful, ensuring seamless SSH access.
   
4. **Security Enhancements Included in the `init_host.sh` Script:**

- SSH Key Generation: The script checks if an SSH key already exists in your home directory. If not, it generates one to facilitate secure SSH connections.

- Disabling Password Authentication for SSH: The script modifies the SSH configuration to disable password-based authentication and challenge-response authentication methods, forcing the use of SSH keys for login.

- Limiting SSH Authentication Attempts: To mitigate brute-force attacks, the script also limits the number of authentication attempts to 3.

5. **Next Steps: Configuring Ansible for Deployment:**

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
