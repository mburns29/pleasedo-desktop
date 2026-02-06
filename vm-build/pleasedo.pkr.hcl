packer {
  required_plugins {
    virtualbox = {
      version = ">= 1.0.0"
      source  = "github.com/hashicorp/virtualbox"
    }
  }
}

variable "debian_iso_url" {
  type    = string
  default = "https://cdimage.debian.org/debian-cd/current/amd64/iso-cd/debian-12.9.0-amd64-netinst.iso"
}

variable "debian_iso_checksum" {
  type    = string
  default = "sha256:1536d0a0e1cd0e8e0e5e6a6b9c6e1f8c4a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6"
}

source "virtualbox-iso" "pleasedo" {
  guest_os_type    = "Debian_64"
  iso_url          = var.debian_iso_url
  iso_checksum     = var.debian_iso_checksum
  
  vm_name          = "pleasedo-desktop"
  disk_size        = 20000
  memory           = 2048
  cpus             = 2
  
  ssh_username     = "pleasedo"
  ssh_password     = "pleasedo"
  ssh_timeout      = "30m"
  
  shutdown_command = "sudo shutdown -P now"
  
  boot_command = [
    "<esc><wait>",
    "auto url=http://{{ .HTTPIP }}:{{ .HTTPPort }}/preseed.cfg<enter>"
  ]
  
  http_directory = "http"
  
  vboxmanage = [
    ["modifyvm", "{{.Name}}", "--nat-localhostreachable1", "on"],
    ["modifyvm", "{{.Name}}", "--graphicscontroller", "vmsvga"],
    ["modifyvm", "{{.Name}}", "--vram", "64"]
  ]
  
  export_opts = [
    "--manifest",
    "--vsys", "0",
    "--description", "PleaseDo Desktop - Clawdbot AI Agent",
    "--version", "1.0.0"
  ]
  
  format = "ova"
  output_directory = "output-pleasedo"
  output_filename  = "pleasedo-desktop"
}

build {
  sources = ["source.virtualbox-iso.pleasedo"]
  
  # Install base packages
  provisioner "shell" {
    inline = [
      "sudo apt-get update",
      "sudo apt-get install -y curl git build-essential"
    ]
  }
  
  # Install Node.js 22
  provisioner "shell" {
    inline = [
      "curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -",
      "sudo apt-get install -y nodejs"
    ]
  }
  
  # Install Clawdbot
  provisioner "shell" {
    inline = [
      "sudo npm install -g clawdbot"
    ]
  }
  
  # Copy setup scripts
  provisioner "file" {
    source      = "files/"
    destination = "/home/pleasedo/"
  }
  
  # Configure auto-start and first-boot wizard
  provisioner "shell" {
    inline = [
      "chmod +x /home/pleasedo/*.sh",
      "sudo cp /home/pleasedo/pleasedo-setup.desktop /etc/xdg/autostart/",
      "sudo cp /home/pleasedo/motd /etc/motd"
    ]
  }
  
  # Clean up
  provisioner "shell" {
    inline = [
      "sudo apt-get clean",
      "sudo rm -rf /var/lib/apt/lists/*",
      "history -c"
    ]
  }
}
