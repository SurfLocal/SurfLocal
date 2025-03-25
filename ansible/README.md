# Running the Ansible Playbook

To set up your Raspberry Pi cluster, including installing and updating dependencies, Docker, Helm, and k3s, follow these steps:

## Configure Ansible Hosts

### Create the Ansible Hosts File

Before running the playbook, create an inventory file to define your cluster nodes. Create a file named `hosts` in the `ansible` directory:

```
[master_node]
master ansible_host=master ansible_user=pi

[worker_nodes]
worker1 ansible_host=worker1 ansible_user=pi
worker2 ansible_host=worker2 ansible_user=pi
worker3 ansible_host=worker3 ansible_user=pi

[database_node]
postgres ansible_host=postgres ansible_user=pi

[rpi_cluster:children]
master_node
worker_nodes
database_node
```

### Verification

Ping All Nodes:
```bash
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

## Run the Ansible Playbook

1. **Navigate to the Ansible Directory:**
   ```bash
   cd ansible
   ```

2. **Run the Playbook:**
   Execute the Ansible playbook to install and update dependencies, Docker, Helm, and k3s on all nodes.
   ```bash
   ansible-playbook playbooks/site.yaml
   ```

## Playbook Breakdown

### 1. Docker Installation

This section installs Docker and configures the system to allow the user to manage Docker without requiring `sudo`:

- Adds the Docker GPG key.
- Adds the Docker APT repository for ARM64 architecture.
- Installs the following Docker-related packages:
  - `docker-ce` (Docker Community Edition)
  - `docker-ce-cli` (Docker command-line interface)
  - `containerd.io` (Containerd container runtime)
- Adds the user to the Docker group to allow Docker management without root permissions.

### 2. Helm Installation

This section automates the installation of Helm 3 (a package manager for Kubernetes):

- Downloads the Helm installation script.
- Executes the script to install Helm 3 on the system.

### 3. K3s Installation

This section sets up K3s, a lightweight Kubernetes distribution:

- Installs K3s on the master node and initializes the Kubernetes cluster.
- Retrieves the K3s join token and stores it for use on worker nodes.
- Configures worker nodes to join the K3s cluster using the join token.
- Fetches and updates the kubeconfig file to ensure proper access to the Kubernetes cluster from the local machine.

### 4. Node Exporter Installation

This section installs Prometheus Node Exporter to collect system metrics:

- Downloads and extracts Node Exporter.
- Moves the Node Exporter binary to `/usr/local/bin`.
- Creates a systemd service for Node Exporter to ensure it runs on system startup.
- Starts and enables the Node Exporter service for continuous system monitoring.

### 5. No-IP DUC Installation

This section sets up the No-IP Dynamic Update Client (DUC), which updates DNS records based on the changing IP address of the machine:

- Downloads the No-IP DUC package.
- Extracts and installs the package.
- Creates a systemd service for the No-IP DUC to keep the DNS updated automatically.
- Ensures the No-IP DUC service starts on boot.

### 6. PostgreSQL Installation and Configuration

This section automates the installation and configuration of PostgreSQL:

- Installs PostgreSQL and identifies the correct version directory.
- Finds the largest available drive and mounts it to `/mnt/postgres_data` for PostgreSQL data storage.
- Updates PostgreSQL configuration files to use the new data directory.
- Modifies PostgreSQL's `pg_hba.conf` file to allow connections from the master and worker nodes.
- Creates a custom systemd service for PostgreSQL to ensure it runs correctly on boot.
- Restarts and enables the PostgreSQL service.

## Verification

Make sure when running the script, that if you are asked about the contents of `ssh_config`, you elect to keep your current configuration. After running the playbook, you can verify that Docker, Helm, Kubernetes, and Node Exporter are correctly installed and running on all nodes.

1. **Verify Docker Installation**
   Check Docker Version:
   ```bash
   ansible all -m shell -a "docker --version"
   ```

   Expected Output:
   ```bash
   master | CHANGED | rc=0 >>
   Docker version 20.10.7, build f0df350
   worker1 | CHANGED | rc=0 >>
   Docker version 20.10.7, build f0df350
   worker2 | CHANGED | rc=0 >>
   Docker version 20.10.7, build f0df350
   worker3 | CHANGED | rc=0 >>
   Docker version 20.10.7, build f0df350
   ```

2. **Verify Helm Installation**
   Check Helm Version:
   ```bash
   ansible master_node -m shell -a "helm version --short"
   ```

   Expected Output:
   ```bash
   master | CHANGED | rc=0 >>
   v3.6.3+g22079b6
   ```

3. **Verify Kubernetes Installation**
   On the master node, run the following command to check the status of all nodes in the cluster:
   ```bash
   kubectl get nodes
   ```

   Expected Output:
   ```bash
   NAME       STATUS   ROLES                  AGE   VERSION
   master     Ready    control-plane,master   10m   v1.21.1+k3s1
   worker1    Ready    <none>                 10m   v1.21.1+k3s1
   worker2    Ready    <none>                 10m   v1.21.1+k3s1
   worker3    Ready    <none>                 10m   v1.21.1+k3s1
   ```

4. **Verify Node Exporter Installation**
   Check the status of the Node Exporter service on all nodes:
   ```bash
   ansible all -m shell -a "systemctl is-active node_exporter" -b
   ```

   Expected Output (truncated/abbreviated): 
   ```bash
   master | CHANGED | rc=0 >>
   ● node_exporter.service - Node Exporter
      Loaded: loaded (/etc/systemd/system/node_exporter.service; enabled; preset: enabled)
      Active: active (running) since <date>; <time> ago
      Main PID: <PID> (node_exporter)
         Tasks: <number>
      Memory: <memory>
         CPU: <CPU>
      CGroup: /system.slice/node_exporter.service
               └─<PID> /usr/local/bin/node_exporter
   ```
   The `<date>`, `<time>`, `<PID>`, `<number>`, `<memory>`, and `<CPU>` will be replaced by actual values when run. This abbreviated output indicates that Node Exporter is active and running.
   
### Troubleshooting

If you encounter any issues during the installation or verification steps, you can check the logs for more details:

**Ansible Logs:**
Check the output of the Ansible playbook run for any error messages or failed tasks.

**Docker Logs:**
On any node, you can check the Docker logs using the following command:

```bash
sudo journalctl -u docker.service
```

**Kubernetes Logs:**
On the master node, you can check the Kubernetes logs using the following command:

```bash
sudo journalctl -u k3s
```

**cgroup Settings:**

Ensure that cgroups are enabled. This is necessary in order for k3s to run. You can check this by running `cat /proc/cgroups` on each node to see if the memory group is enabled.

```bash
cat /proc/cgroups
```

Verify that the memory cgroup is enabled. The output should include a line similar to:

```plaintext
memory  0       126       1
```

Additionally, compare the output of your `cmdline.txt` file to ensure it has the necessary parameters for cgroup settings. The file should contain:

```plaintext
cgroup_enable=cpuset cgroup_enable=memory cgroup_memory=1
```

You can check the `cmdline.txt` file by running:

```bash
cat /boot/firmware/cmdline.txt
```

Ensure that the parameters are all on one line.
