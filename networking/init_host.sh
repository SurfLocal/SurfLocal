#!/bin/bash

##################################
# Argument Check
##################################

# Check if the host name argument is provided
if [ -z "$1" ]; then
  echo "Usage: $0 {master|worker1|worker2}"
  echo "Example: $0 worker1"
  exit 1
fi

HOST_NAME=$1
HOST_NAME_LOCAL="$1.local"  # mDNS hostname for local network discovery
USER_NAME="pi"
HOSTS_FILE="/etc/hosts"
SSH_KEY_PATH="$HOME/.ssh/cluster_key.pub"
SSH_CONFIG_FILE="$HOME/.ssh/config"

##################################
# SSH Key Generation (only if needed)
##################################

# Check if the SSH key exists
if [ ! -f "$SSH_KEY_PATH" ]; then
  echo "SSH key not found, generating a new one..."
  mkdir -p "$HOME/.ssh"
  ssh-keygen -t rsa -b 4096 -f "$HOME/.ssh/cluster_key" -N ""
else
  echo "SSH key already exists at $SSH_KEY_PATH"
fi

##################################
# Configure Local SSH Client
##################################

# Ensure SSH config file exists
if [ ! -f "$SSH_CONFIG_FILE" ]; then
  touch "$SSH_CONFIG_FILE"
fi

# Check if entry already exists
if ! grep -q "Host $HOST_NAME" "$SSH_CONFIG_FILE"; then
  echo -e "\nHost $HOST_NAME
    HostName $HOST_NAME
    User $USER_NAME
    IdentityFile ~/.ssh/cluster_key" >> "$SSH_CONFIG_FILE"
  echo -e "SSH config updated for $HOST_NAME.\n"
else
  echo -e "SSH config already contains an entry for $HOST_NAME.\n"
fi

# Prompt user to enable public DNS
read -r -p "Do you want to enable public DNS for this host (surflocal<hostname>.ddns.net)? (y/n): " enable_dns

# If user chooses to enable DNS
if [[ "$enable_dns" == "y" || "$enable_dns" == "Y" ]]; then
  # Get the DNS hostname
  DNS_HOST_NAME="surflocal$HOST_NAME.ddns.net"

  # Check if entry already exists
  if ! grep -q "Host $DNS_HOST_NAME" "$SSH_CONFIG_FILE"; then
    echo -e "\nHost $DNS_HOST_NAME
      HostName $DNS_HOST_NAME
      Port 2222
      User $USER_NAME
      IdentityFile ~/.ssh/cluster_key" >> "$SSH_CONFIG_FILE"
    echo -e "SSH config updated for $DNS_HOST_NAME.\n"
  else
    echo -e "SSH config already contains an entry for $DNS_HOST_NAME.\n"
  fi
fi

# Set proper permissions for SSH config file
chmod 600 "$SSH_CONFIG_FILE"

##################################
# Configure SSH and Copy Key on Remote Host
##################################

# Wait for the Pi to come online
echo "Waiting for $HOST_NAME_LOCAL to come online (this may take 1-2 minutes for first boot)..."
MAX_ATTEMPTS=60
ATTEMPT=0
HOST_IP=""

# First try mDNS resolution
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  HOST_IP=$(ping -c 1 -W 1 "$HOST_NAME_LOCAL" 2>/dev/null | head -1 | grep -oE '\([0-9.]+\)' | tr -d '()')
  
  if [ -n "$HOST_IP" ]; then
    echo "Found $HOST_NAME_LOCAL at $HOST_IP"
    break
  fi
  
  ATTEMPT=$((ATTEMPT + 1))
  printf "."
  sleep 2
done
echo ""

# If mDNS fails, scan local network for Raspberry Pi devices
if [ -z "$HOST_IP" ]; then
  echo "mDNS resolution failed. Scanning local network for Raspberry Pi devices..."
  
  # Get Raspberry Pi MAC prefixes (common ones)
  RPI_MACS="b8:27:eb\|dc:a6:32\|e4:5f:01\|d8:3a:dd\|28:cd:c1\|2c:cf:67"
  
  # Find Raspberry Pis in ARP table
  RPI_IPS=$(arp -a | grep -i "$RPI_MACS" | grep -oE '\([0-9.]+\)' | tr -d '()')
  
  if [ -z "$RPI_IPS" ]; then
    echo "Error: No Raspberry Pi devices found on the network."
    echo "Please ensure the Pi is powered on and connected to the network."
    exit 1
  fi
  
  echo "Found Raspberry Pi device(s). Checking which one is $HOST_NAME..."
  
  # Check each Pi to find the one with matching hostname
  for ip in $RPI_IPS; do
    # Check if SSH port is open
    if nc -z -w 1 "$ip" 22 2>/dev/null; then
      # Try to get hostname (will prompt for password if needed)
      REMOTE_HOSTNAME=$(ssh -o ConnectTimeout=3 -o BatchMode=yes -o StrictHostKeyChecking=no "$USER_NAME@$ip" "hostname" 2>/dev/null || echo "")
      
      if [ "$REMOTE_HOSTNAME" = "$HOST_NAME" ]; then
        HOST_IP="$ip"
        echo "Found $HOST_NAME at $HOST_IP"
        break
      fi
    fi
  done
  
  if [ -z "$HOST_IP" ]; then
    echo "Error: Could not find a Pi with hostname '$HOST_NAME'."
    echo "Found Raspberry Pi devices at: $RPI_IPS"
    echo "You may need to manually check which one is $HOST_NAME."
    exit 1
  fi
fi

# Add entry to /etc/hosts if not already present
if ! grep -q " $HOST_NAME$" "$HOSTS_FILE"; then
  echo "Adding $HOST_NAME to $HOSTS_FILE..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔐 SUDO PASSWORD REQUIRED (Your local's password, not the Pi's)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "$HOST_IP $HOST_NAME" | sudo tee -a "$HOSTS_FILE" > /dev/null
  echo "✓ Added $HOST_NAME -> $HOST_IP to $HOSTS_FILE"
else
  echo "$HOST_NAME already exists in $HOSTS_FILE"
fi

# Remove old SSH host key if it exists (prevents host key mismatch errors)
echo "Removing old SSH host key for $HOST_IP (if exists)..."
ssh-keygen -R "$HOST_IP" 2>/dev/null || true
ssh-keygen -R "$HOST_NAME" 2>/dev/null || true
ssh-keygen -R "$HOST_NAME_LOCAL" 2>/dev/null || true

# Copy SSH key using ssh-copy-id (handles password prompt properly)
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔑 PI PASSWORD REQUIRED (The password you set in Raspberry Pi Imager)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Copying SSH key to $HOST_IP..."
ssh-copy-id -i "$SSH_KEY_PATH" -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$USER_NAME@$HOST_IP"

# Now configure SSH security on the remote host
echo "Configuring SSH security on $HOST_NAME..."
LC_ALL=C ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -o LogLevel=ERROR "$USER_NAME@$HOST_IP" 'bash -s' << 'EOL' 2>&1 | grep -v -E "(setlocale|locale|warning:|perl:|LANGUAGE|LC_|LANG=|are supported|Falling back|_____)"

# Modify SSH configuration to disable password authentication and enhance security
echo -e "\n# Disable password-based authentication for SSH login
PasswordAuthentication no

# Disable challenge-response authentication methods (another form of password-based login)
ChallengeResponseAuthentication no

# Limit the number of authentication attempts per connection to 3
MaxAuthTries 3" | sudo tee -a /etc/ssh/sshd_config > /dev/null

# Disable the locale warning message for all users
sudo touch /var/lib/cloud/instance/locale-check.skip 2>/dev/null || true

# Restart SSH service to apply changes
sudo systemctl enable ssh 2>/dev/null
sudo systemctl restart ssh 2>/dev/null

EOL

##################################
# Verify SSH Key Copy Success
##################################

# Wait a moment for SSH service to restart
sleep 2

if ssh -q -i "$HOME/.ssh/cluster_key" -o StrictHostKeyChecking=no "$USER_NAME@$HOST_NAME" "echo 'SSH Key copied successfully!'" &>/dev/null; then
  echo -e "\n✓ SSH key copied successfully to the host. You can now log in without a password."
  echo -e "✓ Password authentication has been disabled for security."
  echo -e "\nSetup complete for $HOST_NAME. Test with: ssh $HOST_NAME"
else
  echo -e "\nWarning: Could not verify key-only login, but the key was copied."
  echo -e "Try connecting with: ssh $HOST_NAME"
fi
