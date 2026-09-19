"""Isolated loopback integration tests. Stops only processes created by this test."""
from pathlib import Path
from http.client import HTTPException
from urllib.request import build_opener, ProxyHandler
import json, shutil, socket, subprocess, sys, tempfile, time

source=Path(__file__).resolve().parent/'start.py'
def health(port):
    try:
        with build_opener(ProxyHandler({})).open(f'http://127.0.0.1:{port}/health.json',timeout=.3) as r:
            return json.load(r)
    except (OSError,ValueError,HTTPException):
        return None

with tempfile.TemporaryDirectory(prefix='soma-startup-test-') as tmp:
    root=Path(tmp);shutil.copy2(source,root/'start.py')
    # Find two consecutive ports without disrupting existing listeners.
    for _ in range(100):
        sockets=[]
        try:
            a=socket.socket();sockets.append(a);a.bind(('127.0.0.1',0));port=a.getsockname()[1]
            b=socket.socket();sockets.append(b);b.bind(('127.0.0.1',port+1));break
        except OSError:
            continue
        finally:
            for sock in sockets:sock.close()
    else:raise AssertionError('No consecutive test ports')
    owner=subprocess.Popen([sys.executable,str(root/'start.py'),'--port',str(port+1),'--fixed-port'],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    try:
        deadline=time.monotonic()+8
        while time.monotonic()<deadline and not health(port+1):time.sleep(.05)
        assert health(port+1)=={'app':'SOMA-local','root':str(root)}
        for flags in [[],['--background']]:
            result=subprocess.run([sys.executable,str(root/'start.py'),'--port',str(port),*flags],capture_output=True,text=True,timeout=25)
            assert result.returncode==0,(result.stdout,result.stderr)
            assert f'already running: http://127.0.0.1:{port+1}' in result.stdout,result.stdout
            assert health(port) is None,'Must not create a second listener'
        # Foreign same-port service must produce failure with --fixed-port.
        other=root/'other';other.mkdir();shutil.copy2(source,other/'start.py')
        result=subprocess.run([sys.executable,str(other/'start.py'),'--port',str(port+1),'--fixed-port'],capture_output=True,text=True,timeout=8)
        assert result.returncode==1,(result.stdout,result.stderr)
        assert 'unavailable' in result.stderr
        print('PASS: foreground/background reuse higher port; fixed-port rejects foreign instance.')
    finally:
        if owner.poll() is None:owner.terminate()
        owner.communicate(timeout=5)
