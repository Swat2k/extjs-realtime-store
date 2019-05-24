Ext.define('App.store.Authors', {
    extend: 'App.direct.data.rtStore',
    alias: 'store.authors',
    model: 'App.model.Author',
    storeId: 'authors',
    pageSize: 200,
    autoLoad: true,
    autoSync: true,
    // Сортировки должны совпадать с backend'ом
    // иначе при получении нотификации о создании записи, мы не сможем понять - куда её добавить
	sorters: [{
		property: 'id',
		direction: 'ASC'
	}]
});
