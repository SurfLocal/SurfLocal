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

### Getting the Cluster Up and Running

#### Networking Components

The README in the `networking/` directory provides a detailed guide for setting up networking configurations on Raspberry Pi nodes. It begins with instructions for installing the Raspberry Pi OS and configuring hostnames. The first step involves using the Raspberry Pi Imager to install the OS, where users are prompted to configure a username and password for enabling SSH access. After the OS installation, the 'boot_pi.sh' script is executed to set a unique hostname for each Raspberry Pi and ensure SSH is enabled. This automates the pre-boot configuration, making it easier to prepare the devices for remote access.

Next, the `init_host.sh` script is used once the Raspberry Pis are booted and connected to the local network. This script facilitates the setup of secure, passwordless SSH access by generating and transferring SSH keys, and disabling password authentication on the remote machine for enhanced security. The README emphasizes that each Raspberry Pi should be configured with a specific hostname and ensures that SSH access is set up correctly for future, seamless connections.

#### Ansible Provisioning

The Ansible playbooks automate the installation and configuration of essential tools for setting up a containerized and Kubernetes-based environment. It begins by installing Docker on ARM64 systems, adding the necessary GPG key and repository, and ensuring that the user can run Docker commands without sudo. Helm, a package manager for Kubernetes, is also installed by downloading and executing its installation script.

The playbooks then handle the installation and configuration of K3s, a lightweight Kubernetes distribution. The master node is initialized and the necessary join token is retrieved to add worker nodes to the cluster. Systemd services are enabled for both the K3s master and worker nodes to ensure they start automatically on boot. Additionally, Node Exporter is installed to collect system metrics for Prometheus monitoring, and the No-IP Dynamic Update Client (DUC) is configured for dynamic DNS management.

Finally, PostgreSQL is installed and configured to run with its data directory stored on a larger partition. The playbooks ensure PostgreSQL is set up to listen on both localhost and Kubernetes nodes and create a custom systemd service to manage its startup. These playbooks streamline the setup process by automating the installation and configuration of critical tools for development or production environments.

#### Helm Deployments

Once the infrastructure for Kubernetes and PostgreSQL is set up, applications and workflows are managed and deployed to the cluster using Helm. Helm simplifies the deployment process by providing a consistent, repeatable way to manage Kubernetes applications. It is used to control Argo workflows for orchestrating and automating tasks, Grafana and Prometheus for monitoring and visualization, and MinIO for S3-compatible log storage. Additionally, Helm manages the deployment of the frontend application in the development environment.

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

3. **Install `iproute2mac`:** The `ip` command (part of `iproute2mac`) is used to retrieve the router IP and perform other network-related tasks.
   ```bash
   brew install iproute2mac
   ```
