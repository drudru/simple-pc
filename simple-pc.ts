

import net = require('net');
import fs = require('fs');
import path = require('path');
import fibers = require('fibers');

function left_pad(txt:string, pad:string, total:number):string
{
  if (txt.length >= total)
    return txt;
  if (pad.length != 1)
    throw 'invalid pad';

  let num = total - txt.length;
  
  let array = new Array(num);
  array.push(txt);

  let result = array.join(pad); 
  return result;
  
}


class SimplePC_Base
{
  
  path:string;
  
  constructor(path:string)
  {
    this.path = path;
  }

  protected create_rq_packet(cmd:string, payload:any):string
  {
      let packet = ["rq2"];
      var json = JSON.stringify([cmd, payload]);
      var buff_len = Buffer.byteLength(json, 'utf8');
      packet.push(left_pad(buff_len.toString(10), "0", 8));
      packet.push(json);
      
      return packet.join(' ');
  }
  
}

class SimplePC_Packet
{
  pkt:string;
  msg:any;
  
  constructor()
  {
    this.msg = null;
    this.pkt = '';
  }
  
  add_data(data:Buffer)
  {
    this.pkt = this.pkt + data;
  }

  is_ready():boolean
  {
    // Avoid being clever for now by building a neat state machine    
    if (this.pkt.length < 12)
      return false;

    let hdr_ver = this.pkt.slice(0,4);
    let hdr_size = this.pkt.slice(4,12);
    let payload = this.pkt.slice(13);
    
    if (hdr_ver != 'rq2 ')
      throw new Error('invalid protocol');
  
    var len = parseInt(hdr_size, 10);
    if (len < Buffer.byteLength(payload, 'utf8'))
      return false;
      // throw new Error('invalid protocol - length mismatch');
      
    // Ok, extract json
    let json = this.pkt.slice(13, 13 + len); 
  
    this.msg = JSON.parse(json);
    
    // Ok - if we make it to here, we are done
    // consume the data
    this.pkt = this.pkt.slice(13 + len + 1);
    return true;
  }  
}

export class SimplePC_UnixDomain_Server extends SimplePC_Base
{
  in_box:any[];
  fiber:fibers.Fiber;
  out_box:any;
  listen_sock:net.Server;
  private in_sleep:boolean;

  constructor(path:string)
  {
    super(path);
    this.in_box = [];
    this.fiber = fibers.current;
    this.out_box = this.create_rq_packet('ok', []);
    
    try {
      fs.unlinkSync(path);
    } catch (e) {
      if (e.code !== 'ENOENT')
        throw e;
    }
    this.listen_sock = net.createServer((sock:net.Socket) => {
      // We get a connection
      let pkt = new SimplePC_Packet();
      sock.on('data', (d:Buffer) => {
        pkt.add_data(d);
        
        if (pkt.is_ready()) {
          //console.log('writing reply: ', this.out_box);
          sock.write(this.out_box);  // send standard 'ok' reply
          sock.end();
  
          this.in_box.push(pkt.msg);
          
          if (!this.in_sleep)
            this.fiber.run();
        }
      });
      sock.on('close', () => { });
      sock.on('end', () => { });
      sock.on('error', (e) => {
        console.log('got error', e);
        throw new Error('socket error: ' + e); 
      });
    });
    this.listen_sock.listen(path);
  }
  
  sleep(millis:number):void
  {
    this.in_sleep = true;
    setTimeout(() => {
      this.in_sleep = false;
      this.fiber.run();
    }, millis);
    fibers.yield();
  }

  private shutdown():void
  {
    this.listen_sock.close();
    this.listen_sock = null;  
  }
  
  receive(timeout_ms:number):any
  {
    if (this.fiber !== fibers.current)
      throw new Error('Invalid fiber');

    if (this.in_box.length != 0) {
      let x = this.in_box.shift();  //interesting - how would we prove
      this.shutdown();
      return x;                     // to a prover that this cannot
                                    // return 'timeout'
    }

    let timer = setTimeout(() => {
      this.in_box.unshift('timeout');
      this.fiber.run();
    }, timeout_ms);
    
    fibers.yield();
    
    clearTimeout(timer);
    timer = null;
    
    if (this.in_box.length == 0)
      throw new Error('bad result');
    if (this.in_box[0] == 'timeout')
      throw new Error('timeout');
    let result = this.in_box.shift();
    
    this.shutdown();

    return result;
  }
  
  receive_multi(timeout_ms:number, num_msgs:number, cb:(any) => void):void
  {
    if (this.fiber !== fibers.current)
      throw new Error('Invalid fiber');

    while (num_msgs) {
      if (this.in_box.length != 0) {
        console.log('already here');
        num_msgs--;
        let x = this.in_box.shift();  //interesting - how would we prove
        cb(x);                        // to a prover that this cannot
                                      // return 'timeout'
        continue;
      }

      let timer = setTimeout(() => {
        this.in_box.unshift('timeout');
        this.fiber.run();
      }, timeout_ms);
      
      fibers.yield();
      
      clearTimeout(timer);
      timer = null;
      
      if (this.in_box.length == 0)
        throw new Error('bad result');
      if (this.in_box[0] == 'timeout')
        throw new Error('timeout');
      let result = this.in_box.shift();
      num_msgs--;
      cb(result);
    }
    
    this.shutdown();
  }  
}



export class SimplePC_UnixDomain_Client  extends SimplePC_Base
{
  sock:net.Socket;
  connected:boolean;
  out_box:any;            // to the server
  in_box:any[];           // from the server
  fiber:fibers.Fiber;
  
  constructor(path:string)
  {
    super(path);
    var sock = net.connect(path);
    this.sock = sock;
    this.connected = false;
    this.in_box = [];
    
    // sigh... connect may take a while...
    sock.on("connect", () => {
      this.connected = true;
      if (this.out_box) {
        sock.write(this.out_box);
      }
    });
    
    let pkt = new SimplePC_Packet();
    sock.on('data', (d:Buffer) => {
      pkt.add_data(d);
      if (!pkt.is_ready())
        return;
      if (pkt.msg[0] != "ok")
        throw new Error('server error: ' + pkt.msg);
          
      this.in_box.push(pkt.msg);
      this.fiber.run();
    });
    sock.on('close', () => { });
    sock.on('end',  () => { });
    sock.on('error', (e) => {
      console.log('got error', e);
      throw new Error('socket error: ' + e); 
    });
  }

  send(timeout_ms:number, cmd:string, payload:any):any
  {
    let pkt = this.create_rq_packet(cmd, payload);
    if (this.connected)
      this.sock.write(pkt);
    else
      this.out_box = pkt;

    this.fiber = fibers.current;
    let timer = setTimeout(() => {
      this.in_box.unshift('timeout');
      this.fiber.run();
    }, timeout_ms);

    fibers.yield();

    clearTimeout(timer);
    timer = null;
    
    if (this.in_box.length == 0)
      throw new Error('bad state');
    if (this.in_box[0] == 'timeout')
      throw new Error('timeout');
    let result = this.in_box.shift();
    this.fiber = null;  // Free up for GC
    return result;
  }
}



// TODO
// enum for status
// objects for msg and msg-id
// logging with levels

export default class SimplePC
{
  static create_unix_server(path:string):SimplePC_UnixDomain_Server
  {
    let o = new SimplePC_UnixDomain_Server(path);
      
    return o;
  }

  static create_unix_client(path:string):SimplePC_UnixDomain_Client
  {
    let o = new SimplePC_UnixDomain_Client(path);
      
    return o;
  }
}