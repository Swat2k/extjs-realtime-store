import 'package:jaguar_orm/jaguar_orm.dart';
import 'package:intl/intl.dart';
part 'Author.jorm.dart';

class Author {

    @PrimaryKey(auto: true, isNullable: false)
    int id;

    @Column(length: 50)
    String first_name;

    @Column(length: 50)
    String last_name;

    @Column(length: 100)
    String email;

    DateTime birthdate;

    DateTime added;

    static const String tableName = 'authors';

    // Удобно описываться необходимые поля которые должны отдаваться на фронт
    // Не обязательно показывать всю модель
    Map < String, dynamic > toJson() => {
        'id': id,
        'first_name': first_name,
        'last_name': last_name,
        'birthdate': new DateFormat('yyyy-MM-dd').format(birthdate),
        'added': new DateFormat('yyyy-MM-dd').format(added)
    };
}

@GenBean()
class AuthorBean extends Bean < Author > with _AuthorBean {
    AuthorBean(Adapter adapter): super(adapter);

    @override
    String get tableName => Author.tableName;
}