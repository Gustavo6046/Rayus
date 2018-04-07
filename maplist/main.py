import bson
import struct
import json
import websockets
import random
from os.path import isfile
from autobahn.twisted.websocket import WebSocketServerProtocol


db = {}

fp = None

if isfile("maplist.bson"):
    fp = open("maplist.bson", 'w+b')
    
    try:
        db = bson.loads(fp.read())
        
    except struct.error:
        db = {}
        fp.write(bson.dumps(db))
       
    finally:
        fp.seek(0)

else:
    fp = open("maplist.bson", 'w+b')
    fp.write(bson.dumps(db))
    fp.seek(0)

class MapListServer(WebSocketServerProtocol):
    def onConnect(self, request):
        print("Client connecting: {}".format(request.peer))

    def onOpen(self):
        print("WebSocket connection open.")

    def onMessage(self, payload, isBinary):
        if isBinary:
            self.sendMessage(b"ERR:CANTBINARY", isBinary = False)
            return
        
        payload = payload.decode('utf-8')
        
        if ':' not in payload:
            self.sendMessage(b"ERR:BADSYNTAX", isBinary = False)
            return
            
        command = payload.split(':')[0]
        
        print("Command received: {}".format(command))
        
        data = payload[payload.find(':') + 1 :]
        
        if command == "RETRIEVE":
            if data not in db:
                self.sendMessage(b"ERR:NOMAP", isBinary = False)
                print("Map not found!")
                return
            
            else:
                map = db[data]
                print("Retrieved map with success: {} lines and {} sprites.".format(len(map['walls']), len(map['sprites'])))
                self.sendMessage(("SUCCESS:"+json.dumps(db[data])).encode('utf-8'), isBinary = False)
                
        elif command == "SAVE":
            while True:
                mid = ''.join([random.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789") for _ in range(0, 20)])
                
                if mid not in db:
                    break

            db[mid] = json.loads(data)
            print("Saved map with success: {}".format(mid))
            self.sendMessage(("SUCCESS:"+mid).encode('utf-8'), isBinary = False)

        else:
            print("Command not understood!")
            self.sendMessage(b"ERR:NOCOMMAND", isBinary = False)
            
        fp.write(bson.dumps(db))
        fp.seek(0)

    def onClose(self, wasClean, code, reason):
        print("WebSocket connection closed: {}".format(reason))
        
if __name__ == '__main__':
   import sys

   from twisted.python import log
   from twisted.internet import reactor
   log.startLogging(sys.stdout)

   from autobahn.twisted.websocket import WebSocketServerFactory
   factory = WebSocketServerFactory()
   factory.protocol = MapListServer

   reactor.listenTCP(8909, factory)
   reactor.run()
