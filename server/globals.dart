import 'package:jaguar_query_postgres/jaguar_query_postgres.dart';
import 'lib/Connection.dart';

/**
 * Активные соединения
 */
final Map<String, Connection> connections = new Map<String, Connection>();

/**
 * Адаптер для соединения с SQL-сервером
 */
final PgAdapter sql = new PgAdapter('example', username: 'example', password: 'example', host: 'localhost');