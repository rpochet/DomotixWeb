exports.install = function() {
    F.route('/*', view_index);
    F.route('/', stop, ['delete', 'authorize']);
    
    SOURCE('swapserver').init();
};

function view_index() {
    var self = this;
    self.view('app');
}

function stop() {
    // stop server
    F.stop();
}