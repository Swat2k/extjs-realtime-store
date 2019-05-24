import "package:json_rpc_2/json_rpc_2.dart"
as json_rpc;
import 'package:stream_channel/stream_channel.dart';

class RPCServer extends json_rpc.Server {

	/**
	 * Мета-информация о доступных методах и их именнованых параметрах
	 */
	Map < String, List > meta = new Map < String, List > ();

	RPCServer(StreamChannel < String > channel):
		super(channel) {
			var me = this;

			// Зарегестрируем системный метод meta, по которому будем возвращать доступные (опубликованные) rpc-функции
			// доступные для фронта, а так же список именнованых параметров этих функций. 			
			// TODO: Можно ли сдесь использовать reflection для поиска аргументов функций?
			me.registerMethod("meta", () {
				return meta.entries.map((MapEntry mapEntry) => {
					'method': mapEntry.key,
					'params': mapEntry.value
				}).toList();
			});

			// Зарегестриуем тестовый метод для проверки исключения
			meta.putIfAbsent('test_exception', () => []);
			me.registerMethod("test_exception", () {
				const EXCEPTION_CODE = 1;
				throw new json_rpc.RpcException(
					EXCEPTION_CODE, "Example exception test");
			});

			// Зарегестриуем тестовый метод например для вычитания
			me.registerMethodWithParams("test_subtract", ["minuend", "subtrahend"], (params) {
				return params["minuend"].asNum - params["subtrahend"].asNum;
			});

		}

	void registerMethodWithParams(String name, List < String > params, Function callback) {
		// Добавляем метод и его параметры, в meta
		meta.putIfAbsent(name, () => params);
		super.registerMethod(name, callback);
	}

}