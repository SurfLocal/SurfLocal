# Networking Configuration

This document describes the networking architecture for the Salt application running on a Raspberry Pi Kubernetes cluster. The architecture enables secure external access to the application through a combination of Cloudflare DNS, Traefik Ingress Controller (K3s default), and automated TLS certificate management.

## Architecture Overview

The networking stack routes external traffic from the internet to services running inside the K3s cluster. Traffic flows through multiple layers, each providing specific functionality for routing, security, and load balancing.

```
                                    INTERNET
                                        |
                                        v
                            +-------------------+
                            |    Cloudflare     |
                            |  (surflocal.app)  |
                            |  DNS + CDN + WAF  |
                            +-------------------+
                                        |
                                        | DNS Resolution
                                        v
                            +-------------------+
                            |   Home Router     |
                            |   NAT/Firewall    |
                            |  Ports 80, 443    |
                            +-------------------+
                                        |
                                        | Port Forward
                                        v
                            +-------------------+
                            |   K3s Cluster     |
                            |  192.168.1.67-70  |
                            +-------------------+
                                        |
                                        v
                            +-------------------+
                            |     Traefik       |
                            | Ingress Controller|
                            |  (K3s Default)    |
                            +-------------------+
                                        |
                        +---------------+---------------+
                        |                               |
                        v                               v
                +---------------+               +---------------+
                |   salt-app    |               |   salt-api    |
                |   Service     |               |   Service     |
                | (Frontend)    |               | (Backend)     |
                +---------------+               +---------------+
                        |                               |
                        v                               v
                +---------------+               +---------------+
                |   salt-app    |               |   salt-api    |
                |     Pods      |               |     Pods      |
                +---------------+               +---------------+
```

## Traffic Flow

When a user visits surflocal.app, the request follows this path:

1. The browser performs a DNS lookup for surflocal.app, which resolves to the public IP address configured in Cloudflare.

2. The request reaches the home router, which has NAT rules forwarding ports 80 and 443 to the cluster nodes.

3. Traefik, running as the default K3s ingress controller with a LoadBalancer service, receives the request on the standard HTTP (port 80) or HTTPS (port 443) port.

4. Based on the Host header and path defined in IngressRoute resources, Traefik routes the request to the appropriate Kubernetes service. Requests to surflocal.app route to salt-app, while requests to surflocal.app/api route to salt-api.

5. The service load balances the request across available pods, which process the request and return a response.

## TLS Termination

HTTPS traffic is terminated at Traefik. The controller holds TLS certificates issued by Let's Encrypt and managed automatically by cert-manager. Certificate renewal occurs automatically before expiration, requiring no manual intervention.

The HTTP-01 challenge method validates domain ownership by serving a token at a well-known path. This requires that port 80 traffic reach the ingress controller during certificate issuance.

## DNS Hairpin Workaround

Home networks typically cannot route traffic from inside the cluster to the public IP and back (DNS hairpin NAT). This causes cert-manager's self-check to fail when validating Let's Encrypt challenges.

To resolve this, CoreDNS is configured to resolve surflocal.app to the Traefik cluster IP internally, allowing the self-check to succeed while external traffic still routes through the public IP.

The CoreDNS configmap includes:

```
10.43.245.181 surflocal.app www.surflocal.app api.surflocal.app
```

This configuration is managed by Ansible in `ansible/roles/coredns/templates/coredns-configmap.yaml.j2`.

## Component Summary

| Component | Purpose | Location |
|-----------|---------|----------|
| Cloudflare | DNS hosting, optional CDN and WAF | External service |
| Router NAT | Forwards external ports to cluster | Network edge |
| Traefik | Routes HTTP traffic to services (K3s default) | kube-system namespace |
| cert-manager | Automates TLS certificate lifecycle | cert-manager namespace |
| salt-app | Frontend React application | salt namespace |
| salt-api | Backend Node.js API | salt namespace |

## Configuration Files

The networking configuration is managed through several files in this repository:

- `networking/INGRESS_CHECKLIST.md` contains the step-by-step setup guide
- `helm/cert-manager/` contains the Let's Encrypt ClusterIssuer configuration
- `helm/salt-app/values.yaml` contains ingress configuration for the frontend
- `helm/salt-api/values.yaml` contains ingress configuration for the API

---

## Router Configuration

### Setting up NAT on your WiFi Router

For an AT&T router, you can enable port forwarding and NAT by following these steps:

**Log in to Your AT&T Router.** Open a web browser and go to http://192.168.1.254 (the default gateway for most AT&T routers). Enter your Device Access Code (printed on your router, usually on a sticker), then click Login.

**Navigate to Port Forwarding / NAT.** In the router interface, go to Firewall > NAT/Gaming, then click Custom Services to manually add a new port forwarding rule.

**Add a Port Forwarding Rule.** Click Add a new user-defined application, enter a name for the rule (e.g., SSH, WebServer, etc.), and select the protocol (TCP, UDP, or both). Enter the port range (e.g., 22 for SSH, 80 for HTTP, 443 for HTTPS), set the Base Host Port (use the same port number), and click Add to List.

**Assign the Port to Your Device.** Go back to NAT/Gaming, find the application you just created in the list, and under Needed by Device, select your device (or enter its local IP manually). Click Add, then Save to apply the settings.

Verify the port is open using an external port check tool like https://canyouseeme.org/. Ensure you ran the `boot_pi.sh` script which configures a hostname for your Pi. You should configure forwarding based on the hostname not the IP to prevent your Pi from losing forwarding after reboot.

---

## Dynamic DNS with No-IP

For environments where Cloudflare is not used or where a dynamic public IP address requires automatic updates, No-IP provides a free dynamic DNS solution.

### Creating a No-IP Account

Go to [No-IP's website](https://www.noip.com/) and create a free or premium account. After verifying your email address, log in and navigate to Dynamic DNS > Hostnames. Click Create Hostname, enter your desired hostname (e.g., surflocal), and select .ddns.net from the available domain options. Choose DNS Host (A) as the record type. Your public IP address should auto-fill; if not, enter it manually. Click Create Hostname to complete the setup.

### No-IP Configuration via Ansible

The Ansible No-IP playbook automates the setup of dynamic DNS using No-IP for the master node and Postgres database. This allows a system with a changing public IP address to be accessible via a consistent domain name. Furthermore, it also allows for the DNS name to be discoverable on the internet once the NAT has been configured on your router.

The playbook installs the No-IP Dynamic Update Client (DUC), configures it to run as a systemd service, and ensures it starts automatically on boot. By periodically updating No-IP's servers with the current IP address, the system remains reachable under a static hostname, even if its external IP changes.
