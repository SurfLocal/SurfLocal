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

## Available Playbooks

The following playbooks are available in the `playbooks/` directory:

| Playbook | Description |
|----------|-------------|
| `site.yaml` | Main playbook that orchestrates all deployments |
| `deploy_cluster.yaml` | Sets up the complete Kubernetes cluster |
| `deploy_common.yaml` | Installs common dependencies and updates packages |
| `deploy_docker.yaml` | Installs Docker CE on all nodes |
| `deploy_helm.yaml` | Installs Helm package manager on master node |
| `deploy_kubernetes.yaml` | Deploys K3s master and worker nodes |
| `deploy_node_exporter.yaml` | Installs Prometheus Node Exporter for metrics |
| `deploy_noip.yaml` | Configures No-IP Dynamic DNS client |
| `deploy_postgres.yaml` | Installs and configures PostgreSQL database |
| `deploy_postgres_exporter.yaml` | Installs PostgreSQL Exporter for Prometheus |
| `deploy_coredns.yaml` | Configures CoreDNS for cluster hostname resolution |
| `deploy_s3_storage.yaml` | Mounts SSD storage for MinIO S3 on master node |

## Roles

Each playbook uses modular roles located in the `roles/` directory:

- **cluster**: Kubernetes cluster initialization and configuration
- **common**: System updates and common package installation
- **coredns**: CoreDNS configuration for hostname resolution
- **docker**: Docker CE installation and user configuration
- **helm**: Helm 3 installation
- **k3s_master**: K3s master node setup
- **k3s_worker**: K3s worker node configuration
- **node_exporter**: Prometheus Node Exporter installation
- **noip**: No-IP Dynamic DNS client setup
- **postgres**: PostgreSQL installation with custom data directory
- **postgres_exporter**: PostgreSQL Exporter for Prometheus monitoring
- **s3_storage**: SSD storage mounting for MinIO

## Playbook Details

### Docker Installation (`deploy_docker.yaml`)

- Adds Docker GPG key and APT repository for ARM64
- Installs `docker-ce`, `docker-ce-cli`, and `containerd.io`
- Adds user to Docker group for sudo-less management

### Kubernetes Setup (`deploy_kubernetes.yaml`)

- Installs K3s on master node and initializes cluster
- Retrieves join token for worker nodes
- Configures worker nodes to join the cluster
- Updates local kubeconfig for cluster access

### PostgreSQL Setup (`deploy_postgres.yaml`)

- Installs PostgreSQL on dedicated database node
- Mounts largest available drive to `/mnt/postgres_data`
- Configures `postgresql.conf` and `pg_hba.conf` for cluster access
- Sets up peer authentication for local access
- Creates custom systemd service for PostgreSQL

### Monitoring Setup

- **Node Exporter** (`deploy_node_exporter.yaml`): Collects system metrics on all nodes
- **PostgreSQL Exporter** (`deploy_postgres_exporter.yaml`): Exports PostgreSQL metrics for Prometheus

### CoreDNS Configuration (`deploy_coredns.yaml`)

- Configures CoreDNS to resolve cluster hostnames
- Enables Kubernetes pods to resolve `master`, `worker1-3`, and `postgres` hostnames
- Essential for Prometheus scrape targets and inter-service communication

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
