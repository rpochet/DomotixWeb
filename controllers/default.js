exports.install = function() {
    F.route('/*', view_index, ['authorize']);
    F.route('/', stop, ['delete', 'authorize']);
    
    SOURCE('swapserver').init();
};

function view_index() {
    var self = this;
    if(self.req.mobile) {
        self.view('app-mobile');
    } else {        
        self.view('app');
    }
};

function stop() {
    // stop server
    F.stop();
};