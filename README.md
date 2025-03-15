<p align="center">
  <img src="https://github.com/SurfLocal/SurfLocal/blob/media/surfLocal.png?raw=true" width="250" alt="Project Logo">
</p>

# SurfLocal

This is a surfing app that integrates AI-powered swell and condition forecasting, alongside a social platform for surfers to connect and share their sessions. Users can log their surf sessions, share insights, and interact with others within the surfing community.

## Contributing

We welcome contributions to this project! If you're interested in contributing, please read our [Contributing Guidelines](CONTRIBUTING.md) for details on how to get started.

By following these guidelines, you'll help us maintain a consistent development process and ensure a smooth experience for all contributors.

## Key Features:
- AI-Driven Forecasting: Get accurate swell and condition forecasts based on AI models.
- Session Logging: Log details of your surf sessions, including date, time, surf spot, wave conditions, and more.
- Social Interaction: Connect with other surfers, share session details, and interact with the community.
- Real-Time Data: AI-powered predictions for surf conditions, utilizing web scraping to gather data.

## Directory Structure

```
SurfLocal/
├── ansible/
│   ├── ansible.cfg
│   ├── hosts
│   ├── playbooks/
│   │   ├── deploy_docker.yml
│   │   ├── deploy_helm.yml
│   │   ├── deploy_kubernetes.yml
│   │   ├── deploy_node_exporter.yml
│   │   └── site.yml
│   └── roles/
│       └── ...
├── helm/
│   ├── grafana/
│   │   ├── Chart.yaml
│   │   ├── values.yaml
│   │   └── templates/
│   └── prometheus/
│       ├── Chart.yaml
│       ├── values.yaml
│       └── templates/
├── postgres/
│   ├── roles/
│   ├── schemas/
│   ├── tables/
│   ├── users/
│   └── database.sql
├── web-scraping/
│   ├── jobs/
│   └── webscraper.Dockerfile
├── setup_node.sh
├── init_ansible.sh
└── README.md
```

## Getting Started

### Clone this Git Repository

Clone the repository and navigate into it:
```bash
git clone https://github.com/SurfLocal/SurfLocal.git
cd SurfLocal
```

### Install the Raspberry Pi OS on microSD Cards

1. **Install Raspberry Pi Imager and OS:**

   - Download the Raspberry Pi Imager from [https://www.raspberrypi.org/software/](https://www.raspberrypi.org/software/).
   - Insert the SanDisk 32GB microSD card into your computer.
   - Rename the microSD card to `boot`
   - Open the Raspberry Pi Imager and choose the Raspberry Pi OS (64-bit).
   - Select the SD card you inserted.
   - Due to [recent changes](https://www.raspberrypi.com/news/raspberry-pi-bullseye-update-april-2022/), a username and password will have to be provided in order to enable SSH.
   - Click "Next" and configure the host and username with corresponding password in the OS customization menu.
   - When prompted that all existing data will be erased, click "Yes" that you would like to continue.

2. **Prepare the microSD Cards:**

   - Insert the microSD card into your computer.
   - Mount the microSD card's boot partition to the directory `/Volumes/`:
     ```bash
     diskutil list  # Identify the disk identifier for the microSD card (e.g., /dev/disk2)
     diskutil mountDisk /dev/diskX  # Replace /dev/diskX with the appropriate device identifier
     ```
   - Verify the mount:
     ```bash
     ls /Volumes
     ```

3. **Run the `setup_node.sh` Script for Each Node:**

   - Add execution privileges for the script:
     ```bash
     chmod +x setup_node.sh
     ```

   - For the master node:
     ```bash
     sudo ./setup_node.sh master
     ```

   - For the worker nodes:
     ```bash
     sudo ./setup_node.sh worker1
     sudo ./setup_node.sh worker2
     sudo ./setup_node.sh worker3
     ```

4. **Eject the microSD Card:**

   ```bash
   diskutil unmountDisk /dev/diskX  # Replace /dev/diskX with the appropriate device identifier
   ```

5. **Insert Each Prepared microSD Card into the Corresponding Raspberry Pi Device:**

   - The first microSD card into the master node Raspberry Pi.
   - The second microSD card into the worker1 node Raspberry Pi.
   - The third microSD card into the worker2 node Raspberry Pi.
   - The fourth microSD card into the worker3 node Raspberry Pi.
   - Power on each Raspberry Pi and connect them to the network via Ethernet.

### Install Dependencies

#### Steps for MacOS

1. **Install Homebrew:**
   If Homebrew is not installed, install it by running:
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. **Install Ansible:**
   ```bash
   brew install ansible
   ```

3. **Install `nmap`:**
   For retrieving Raspberry Pi IP addresses:
   ```bash
   brew install nmap
   ```

4. **Install `sshpass`:**
   For authenticating via SSH with Ansible:
   ```bash
   brew install sshpass
   ```

5. **Initialize Ansible:**
   Run the `init_ansible.sh` script on your computer:
   ```bash
   sudo ./init_ansible.sh
   ```

6. **Save the Raspberry Pi SSH Password:**
   The `ansible/hosts` file will reference an environment variable for your SSH password so that you do not have to enter it each time you run an Ansible command. You can export this variable as follows:
   ```bash
   export ANSIBLE_SSH_PASS='your_ssh_password_here'
   ```

#### Verification

Ping All Nodes:
```bash
cd ansible
ansible all -m ping
```

Expected Output:
```javascript
master | SUCCESS => {
   "changed": false,
   "ping": "pong"
}
worker1 | SUCCESS => {
   "changed": false,
   "ping": "pong"
}
worker2 | SUCCESS => {
   "changed": false,
   "ping": "pong"
}
worker3 | SUCCESS => {
   "changed": false,
   "ping": "pong"
}
```
