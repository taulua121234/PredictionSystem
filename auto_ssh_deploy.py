import paramiko
import sys
import time

def run_ssh(host, port, username, password):
    print(f"[*] Connecting to {username}@{host}:{port}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(host, port=port, username=username, password=password, timeout=15)
        print("[+] SSH connection established successfully!")
    except Exception as e:
        print(f"[-] SSH Connection failed: {e}")
        sys.exit(1)

    cmd = "cd ~/PredictionSystem && git fetch origin && git checkout deploy && git pull origin deploy && chmod +x setup_vps.sh && ./setup_vps.sh"
    print(f"[*] Executing deployment script on VPS...")
    
    channel = ssh.get_transport().open_session()
    channel.get_pty()
    channel.exec_command(cmd)
    
    buffer = ""
    sudo_sent = False
    
    while True:
        if channel.recv_ready():
            out = channel.recv(1024).decode('utf-8', errors='ignore')
            sys.stdout.write(out)
            sys.stdout.flush()
            buffer += out
            if ("[sudo] password for" in buffer or "password for enima:" in buffer) and not sudo_sent:
                channel.send(password + "\n")
                sudo_sent = True
                buffer = ""
        if channel.exit_status_ready():
            # Flush remaining output
            while channel.recv_ready():
                out = channel.recv(1024).decode('utf-8', errors='ignore')
                sys.stdout.write(out)
                sys.stdout.flush()
            break
        time.sleep(0.1)
        
    exit_code = channel.recv_exit_status()
    print(f"\n[+] Deployment finished with exit code: {exit_code}")
    ssh.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python auto_ssh_deploy.py <password>")
        sys.exit(1)
    pwd = sys.argv[1]
    run_ssh("123.16.178.213", 3030, "enima", pwd)
