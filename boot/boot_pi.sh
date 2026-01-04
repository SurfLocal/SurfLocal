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

##################################
# Mount the Raspberry Pi SD Card
##################################

# Find the disk identifier that contains the bootfs partition
DISK_IDENTIFIER=$(diskutil list | grep -B 1 "bootfs" | grep -o 'disk[0-9]*' | head -n 1)

# Check if the disk identifier was found
if [ -z "$DISK_IDENTIFIER" ]; then
  echo "Error: Could not find a disk with bootfs partition."
  exit 1
fi

# Prepend /dev/ to the disk identifier
DISK_IDENTIFIER="/dev/$DISK_IDENTIFIER"

# Mount the disk
echo "Disk with bootfs partition found: $DISK_IDENTIFIER"
echo "Mounting the disk $DISK_IDENTIFIER..."
diskutil mountDisk "$DISK_IDENTIFIER"

# Check if the boot partition exists
BOOT_DIR="/Volumes/bootfs"
if [ ! -d "$BOOT_DIR" ]; then
  echo "Error: Boot partition not found."
  exit 1
fi

##################################
# Configuration for Hostname
##################################

echo -e "\nConfiguring the hostname..."
touch "$BOOT_DIR/ssh"  # Enable SSH

# Note: User credentials should be set via Raspberry Pi Imager before running this script

# Create firstrun script to configure hostname on first boot
cat > "$BOOT_DIR/firstrun.sh" << EOF
#!/bin/bash
set -e

# Set the hostname
CURRENT_HOSTNAME=\$(cat /etc/hostname | tr -d " \t\n\r")
echo "$HOST_NAME" > /etc/hostname
sed -i "s/127.0.1.1.*\$CURRENT_HOSTNAME/127.0.1.1\t$HOST_NAME/g" /etc/hosts

# Remove this script from cmdline.txt after execution
sed -i 's| systemd.run.*||g' /boot/firmware/cmdline.txt 2>/dev/null || sed -i 's| systemd.run.*||g' /boot/cmdline.txt 2>/dev/null || true

# Reboot to apply hostname
reboot
EOF

chmod +x "$BOOT_DIR/firstrun.sh"

# Modify cmdline.txt to run firstrun.sh on first boot
CMDLINE_FILE="$BOOT_DIR/cmdline.txt"
if [ -f "$CMDLINE_FILE" ]; then
  # Check if firstrun is already configured
  if ! grep -q "systemd.run=" "$CMDLINE_FILE"; then
    # Append firstrun command to existing cmdline
    sed -i '' 's/$/ systemd.run=\/boot\/firmware\/firstrun.sh systemd.run_success_action=reboot systemd.unit=kernel-command-line.target/' "$CMDLINE_FILE"
  fi
fi

echo "Hostname set to $HOST_NAME"

# Unmount the disk
echo -e "\nUnmounting the disk..."
diskutil unmountDisk "$DISK_IDENTIFIER"

echo -e "\nPlease remove the microSD card and insert it into the Raspberry Pi."
