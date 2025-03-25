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
diskutil mountDisk $DISK_IDENTIFIER

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
echo "$HOST_NAME" > "$BOOT_DIR/hostname"  # Set the hostname
echo "127.0.1.1   $HOST_NAME" > "$BOOT_DIR/hosts"  # Configure hosts file
echo "Hostname set to $HOST_NAME"

# Unmount the disk
echo -e "\nUnmounting the disk..."
diskutil unmountDisk $DISK_IDENTIFIER

echo -e "\nPlease remove the microSD card and insert it into the Raspberry Pi."
