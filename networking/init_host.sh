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
USER_NAME="pi"
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

# Store SSH key contents in a variable
SSH_KEY_CONTENT=$(<"$SSH_KEY_PATH")

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

ssh -q "$USER_NAME@$HOST_NAME" >> /dev/null 2>&1 << EOL

# Ensure SSH directory exists
mkdir -p ~/.ssh && chmod 700 ~/.ssh

# Append SSH key to authorized_keys
echo "$SSH_KEY_CONTENT" >> ~/.ssh/authorized_keys

# Set correct permissions on authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Modify SSH configuration to disable password authentication and enhance security
echo -e "\n# Disable password-based authentication for SSH login
PasswordAuthentication no

# Disable challenge-response authentication methods (another form of password-based login)
ChallengeResponseAuthentication no

# Limit the number of authentication attempts per connection to 3
MaxAuthTries 3" | sudo tee -a /etc/ssh/sshd_config > /dev/null

# Restart SSH service to apply changes
sudo systemctl enable ssh
sudo systemctl restart ssh

EOL

##################################
# Verify SSH Key Copy Success
##################################

if ssh -q "$USER_NAME@$HOST_NAME" "echo 'SSH Key copied successfully!'" &>/dev/null; then
  echo -e "\nSSH key copied successfully to the host. You can now log in without a password."
else
  echo -e "\nFailed to copy SSH key to the host. Please check the hostname and SSH configuration."
  exit 1
fi

echo -e "Setup complete for $HOST_NAME. You can now log in using your SSH key without a password prompt."
