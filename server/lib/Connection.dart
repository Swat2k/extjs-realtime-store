import 'package:web_socket_channel/web_socket_channel.dart';

class Connection {

  List < String > global_ref_watch = new List<String>();
  WebSocketChannel socket;

  Connection(WebSocketChannel socket) {
    this.socket = socket;
  }

}