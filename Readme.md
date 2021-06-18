An example of realtime store implementation and their synchronization between different clients

### Features

- Direct provider with rpc 2.0 support
- Receive websockets notifications
- Backend written in Dart (postgres database)
- Transparent data synchronization without exclusive locks and merge problems

### Dependences

- Dart >= 2.2
- PGSQL >= 10
- ExtJS >= 6.6

### Configuration

See globals.dart (for backend), and App.config.Settings (class for frontend)
