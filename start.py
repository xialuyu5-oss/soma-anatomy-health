"""Local-only static server. No downloads, installations, browser launching, or uploads."""
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from http.client import HTTPException
from pathlib import Path
import argparse,functools,json,os,socket,subprocess,sys,time
from urllib.request import build_opener,ProxyHandler
p=argparse.ArgumentParser()
p.add_argument('--port',type=int,default=8765,help='first port to try (default 8765)')
p.add_argument('--background',action='store_true',help='start a detached server and return once it answers')
p.add_argument('--fixed-port',action='store_true',help='fail instead of moving to the next free port')
args=p.parse_args()
root=Path(__file__).resolve().parent
PORT_ATTEMPTS=12
HEALTH={'app':'SOMA-local','root':str(root)}
def url_for(port):return f'http://127.0.0.1:{port}'
def candidate_ports():return [args.port] if args.fixed_port else range(args.port,args.port+PORT_ATTEMPTS)
def healthy(port):
    try:
        with build_opener(ProxyHandler({})).open(url_for(port)+'/health.json',timeout=1) as response:
            return json.load(response)==HEALTH
    except (OSError,ValueError,HTTPException):
        return False
def port_is_free(port):
    # Windows reports reserved ranges (Hyper-V/WSL) as PermissionError; treat every OSError as unavailable.
    try:
        with socket.socket(socket.AF_INET,socket.SOCK_STREAM) as probe:
            probe.bind(('127.0.0.1',port))
        return True
    except OSError:
        return False
def running_instance():
    return next((port for port in candidate_ports() if healthy(port)),None)
def unavailable(ports):
    label=f'port {ports[0]}' if len(ports)==1 else f'ports {ports[0]}-{ports[-1]}'
    return f'{label} unavailable (occupied or reserved by the system)'
port=running_instance()
if port is not None:
    print(f'SOMA is already running: {url_for(port)}',flush=True)
    sys.exit(0)
if args.background:
    port=next((candidate for candidate in candidate_ports() if port_is_free(candidate)),None)
    if port is None:
        print(f'SOMA could not start: {unavailable(list(candidate_ports()))}. Try: python start.py --port 9000',file=sys.stderr)
        sys.exit(1)
    logdir=root/'validation';logdir.mkdir(exist_ok=True)
    options={'creationflags':subprocess.DETACHED_PROCESS|subprocess.CREATE_NEW_PROCESS_GROUP} if os.name=='nt' else {'start_new_session':True}
    with (logdir/'server.log').open('ab') as log:
        child=subprocess.Popen([sys.executable,str(root/'start.py'),'--port',str(port),'--fixed-port'],stdin=subprocess.DEVNULL,stdout=log,stderr=log,close_fds=True,**options)
    for attempt in range(50):
        if healthy(port):
            note='' if port==args.port else f' (port {args.port} was occupied)'
            print(f'SOMA is running in the background: {url_for(port)}{note}',flush=True)
            sys.exit(0)
        if child.poll() is not None:
            break
        time.sleep(.1)
    print('SOMA could not start. Check validation/server.log.',file=sys.stderr)
    sys.exit(1)
class LocalHTTPServer(ThreadingHTTPServer):
    # SO_REUSEADDR on Windows can admit two listeners on the same address.
    allow_reuse_address=os.name!='nt'

class Handler(SimpleHTTPRequestHandler):
    extensions_map={**SimpleHTTPRequestHandler.extensions_map,'.js':'text/javascript','.mjs':'text/javascript','.json':'application/json'}
    def do_GET(self):
        if self.path=='/health.json':
            body=json.dumps(HEALTH).encode()
            self.send_response(200);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
            return
        super().do_GET()
    def end_headers(self):
        self.send_header('Cache-Control','no-cache')
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Referrer-Policy','no-referrer')
        self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' blob:; object-src 'none'; frame-src 'self'; frame-ancestors 'self'")
        super().end_headers()
server=None
tried=[]
for port in candidate_ports():
    tried.append(port)
    if healthy(port):
        print(f'SOMA is already running: {url_for(port)}',flush=True)
        sys.exit(0)
    try:
        server=LocalHTTPServer(('127.0.0.1',port),functools.partial(Handler,directory=str(root)))
        break
    except OSError:
        continue
if server is None:
    print(f'SOMA could not start: {unavailable(tried)}. Try: python start.py --port 9000',file=sys.stderr)
    sys.exit(1)
if port!=args.port:
    print(f'Port {args.port} is occupied; using {port} instead.',flush=True)
print(f'SOMA: {url_for(port)}',flush=True)
try:server.serve_forever()
except KeyboardInterrupt:pass
finally:server.server_close()
