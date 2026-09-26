import sys, pathlib, hashlib, base64, json
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'deploy-tools'))
import paramiko
EXPECTED='SHA256:cvDJPu6d4KwtZuvetg+oN4wrxFcl+3us6nHkdqq+qdw'
class PinnedHost(paramiko.MissingHostKeyPolicy):
    def missing_host_key(self,client,hostname,key):
        got='SHA256:'+base64.b64encode(hashlib.sha256(key.asbytes()).digest()).decode().rstrip('=')
        if key.get_name()!='ssh-ed25519' or got!=EXPECTED: raise RuntimeError('Host fingerprint mismatch; authentication refused')
        print('HOST VERIFIED '+got,flush=True)
client=paramiko.SSHClient();client.set_missing_host_key_policy(PinnedHost())
print('PASSWORD_INPUT_REQUIRED',flush=True)
import getpass
password=getpass.getpass('SSH password: ')
client.connect('14.103.59.73',username='root',password=password,look_for_keys=False,allow_agent=False,timeout=15,disabled_algorithms={'keys':['ssh-rsa','rsa-sha2-256','rsa-sha2-512','ecdsa-sha2-nistp256']})
password=None
print('CONNECTED',flush=True)
for line in sys.stdin:
    try:
        request=json.loads(line)
        if request['op']=='close':break
        if request['op']=='upload':
            with client.open_sftp() as sftp:sftp.put(request['local'],request['remote'])
            print('UPLOAD_OK',flush=True)
        elif request['op']=='exec':
            _,out,err=client.exec_command(request['cmd'],timeout=180)
            stdout=out.read().decode();stderr=err.read().decode();status=out.channel.recv_exit_status()
            print(json.dumps({'status':status,'stdout':stdout,'stderr':stderr},ensure_ascii=False),flush=True)
    except Exception as e:print(json.dumps({'error':str(e)}),flush=True)
client.close()

