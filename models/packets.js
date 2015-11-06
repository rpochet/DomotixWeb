exports.id = 'packets';
exports.version = '1.01';

exports.create = function(user) {
    // NoSQL embedded database
    DATABASE('users').insert(user);
};

exports.load = function(id, callback) {
    // NoSQL embedded database
    DATABASE('users').one(function(doc) {
        return doc.id === id;
    }, callback);
}
