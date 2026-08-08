import paramiko
import sys

def test_auth(pwd):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    print(f"Testing password: {pwd}")
    try:
        client.connect("123.16.178.213", port=3030, username="enima", password=pwd, allow_agent=False, look_for_keys=False)
        print("SUCCESS with standard password auth!")
        client.close()
        return True
    except Exception as e:
        print(f"Standard password auth failed: {e}")
        
    try:
        # Try keyboard-interactive
        transport = paramiko.Transport(("123.16.178.213", 3030))
        transport.connect(username="enima", password=pwd)
        print("SUCCESS with transport connect!")
        transport.close()
        return True
    except Exception as e:
        print(f"Transport auth failed: {e}")
        
    return False

if __name__ == "__main__":
    pwd = sys.argv[1] if len(sys.argv) > 1 else "3030"
    test_auth(pwd)
