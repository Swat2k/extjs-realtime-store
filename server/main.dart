import 'globals.dart'
as globals;
import 'lib/RPCServer.dart'
as json_rpc;
import 'lib/entity/Author.dart';
import 'lib/Connection.dart';
import 'package:uuid/uuid.dart';
import 'package:shelf/shelf_io.dart'
as shelf_io;
import 'package:shelf_web_socket/shelf_web_socket.dart';
import "package:json_rpc_2/json_rpc_2.dart"
as json_rpc;
import 'dart:convert';
import 'package:jaguar_query_postgres/jaguar_query_postgres.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

main() async {

    var handler = webSocketHandler((WebSocketChannel webSocket) {

        // При открытии нового сокета, сгенерируем новый уникальный uuid
        var currentConnectionId = new Uuid().v1(),
            connections = globals.connections,
            connection = new Connection(webSocket);
        
        final jsonEncoder = JsonEncoder();

        // Создадим rpc-сервер
        var server = new json_rpc.RPCServer(webSocket.cast < String > ());

        // и добавляем его в глобальную коллекцию соединений
        connections.putIfAbsent(currentConnectionId, () => connection);

        // И зарегестрируем функции доступные для фронта
        server.registerMethodWithParams("global_ref_watch", ["storeIds"], (params) async {
            try {
                var global_ref_watch = connections[currentConnectionId].global_ref_watch;
                global_ref_watch.clear();
                global_ref_watch.addAll(List<String>.from(params.value["storeIds"]));
                return global_ref_watch;
            } catch (e) {
                return throw new json_rpc.RpcException(
                    32000, e.toString());
            }
        });

        // И зарегестрируем функции доступные для фронта
        server.registerMethodWithParams("authors.read", ["id", "limit", "start"], (params) async {
            try {

                var bean = new AuthorBean(globals.sql);

                // Если мы запрашиваем конкретную запись по id
                if (params.value != null && params.value["id"] != null) {
                    var id = params["id"].asNum,
                        author = await bean.find(id);

                    // Если запись есть, то вернем её, иначе создадим исключение
                    return author == null ?
                        throw new json_rpc.RpcException(
                            32000, "Author (id=${id}) not found"): author;

                } else {

                    // Если это запрос с пагинацией
                    if (params.value != null && params.value["start"] != null && params.value["limit"] != null) {

                        var finder = Find(Author.tableName).selAll().orderBy('id', true).limit(params.value["limit"]).offset(params.value["start"]);
                        List < Author > authors = [];
                        List < Map > maps = await (await globals.sql.find(finder)).toList();

                        for (Map map in maps) {
                            Author author = new Author();
                            author.id = map['id'];
                            author.first_name = map['first_name'];
                            author.last_name = map['last_name'];
                            author.birthdate = map['birthdate'];
                            author.added = map['added'];
                            authors.add(author);
                        }

                        return authors;

                    } else {

                        // Если это запрос без пагинации, отдадим все что есть
                        return await bean.getAll();
                    }
                }

            } catch (e) {
                return throw new json_rpc.RpcException(
                    32000, e.toString());
            }

        });

        // И зарегестрируем функции доступные для фронта
        server.registerMethodWithParams("authors.update", ["items"], (params) async {
            try {
                var items = params.value["items"],
                    bean = new AuthorBean(globals.sql);
                    List < Author > authors = [];

                for (var map in items) {
                    final update = Update(Author.tableName),
                        id = map['id'];

                    map.remove("id");
                    map.forEach((key, value) {
                        update.setValue(key, value);
                    });
                    update.where(eq('id', id));
                    await update.exec(globals.sql);
                    // Собираем ответ

                    var updatedAuthor = await bean.find(id);
                    authors.add(updatedAuthor);

                    // Отправляем нотификацию всем подписанным клиентам
                    
                    connections.forEach((connectionId, connect) {
                        // Если есть подписка на событие, и не будем же мы сами себе отправлять нотификации
                        if (connect.global_ref_watch.contains('authors') && connectionId != currentConnectionId) {
                            connect.socket.sink.add(jsonEncoder.convert({
                                "jsonrpc": "2.0",
                                "method": "authors.update",
                                "params": updatedAuthor
                            }));
                        }
                    });
                }
                return authors;
            } catch (e) {
                return throw new json_rpc.RpcException(
                    32000, e.toString());
            }
        });

        // И зарегестрируем функции доступные для фронта
        server.registerMethodWithParams("authors.delete", ["items"], (params) async {
            try {
                var items = params.value["items"];
                for (var map in items) {
                    var id = map['id'];
                    final st = Remove(Author.tableName).where(eq('id', id));
                    await st.exec(globals.sql);

                    // Отправляем нотификацию всем подписанным клиентам
                    connections.forEach((connectionId, connect) {
                        // Если есть подписка на событие, и не будем же мы сами себе отправлять нотификации
                        if (connect.global_ref_watch.contains('authors') && connectionId != currentConnectionId) {
                            connect.socket.sink.add(jsonEncoder.convert({
                                "jsonrpc": "2.0",
                                "method": "authors.delete",
                                "params": [id]
                            }));
                        }
                    });
                }
                return true;
            } catch (e) {
                return throw new json_rpc.RpcException(
                    32000, e.toString());
            }
        });

        // При закрытии клентского сокета
        server.done.then((_) {
            // Удалим наше соединение из глобальной коллекции
            if (connections.containsKey(currentConnectionId)) {
                connections.remove(currentConnectionId);
            }
        });
        server.listen();
    });

    // Подключаемся к СУБД
    await globals.sql.connect();

    shelf_io.serve(handler, 'localhost', 8080).then((server) {
        print('Serving at ws://${server.address.host}:${server.port}');
    });
}