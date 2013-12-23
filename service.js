var express = require('express');
var server = express();

server.configure(function(){
  server.use(express.bodyParser());
  server.use(server.router);
});

var uid = 100;
function getUid() {
    uid += 1;
    return uid;
}

var contacts = [{
        id: 1,
        name: "Bilbo Baggins",
        phoneNumber: "555-555-2935"
    }, {
        id: 2,
        name: "Thorin Oakenshield",
        phoneNumber: "555-555-2935"
    }, {
        id: 3,
        name: "Balin",
        phoneNumber: "555-555-2935"
    }, {
        id: 4,
        name: "Bifur",
        phoneNumber: "555-555-2935"
    }, {
        id: 5,
        name: "Bofur",
        phoneNumber: "555-555-2935"
    }, {
        id: 6,
        name: "Bombur",
        phoneNumber: "555-555-2935"
    }],
    addresses = {
        1: [{
            id: 1,
            street: "123 Beaker st",
            city: "New York",
            state: "New York",
            country: "United States"
        }],
        2: [{
            id: 2,
            street: "123 Beaker st",
            city: "New York",
            state: "New York",
            country: "United States"
        }],
        3: [],
        4: [],
        5: [],
        6: []
    }

function getItemById(array, id) {
    var id = parseInt(id, 10),
        foundItem,
        index = -1;
    array.some(function (item, i) {
        if (item.id === id) {
            foundItem = item;
            index = i;
            return true;
        }
    })
    return {
        index: index,
        item: foundItem
    };
}

function itemCreate(array, item, callback) {
    if (item instanceof Array) {
        return item.map(function (item) {
            return itemCreate(array, item, callback);
        });
    }
    item.id = getUid();
    if (callback) {
        callback(item);
    }
    array.push(item);
    return item;
}

function itemUpdate(array, item) {
    if (item instanceof Array) {
        return item.map(function (item) {
            return itemUpdate(array, item);
        });
    }

    var foundItem = getItemById(array, item.id);
    if (foundItem.index !== -1) {
        array.splice(foundItem.index, 1, item);
    }
    return item;
}

function itemDelete(array, id, callback) {
    if (id instanceof Array) {
        return id.map(function (id) {
            return itemDelete(array, id, callback);
        });
    }
    var foundItem = getItemById(array, id);
    if (foundItem.index !== -1) {
        array.splice(foundItem.index, 1);
        if (callback) {
            callback(id);
        }
    }
    return id;
}

server.post('/api/contacts', function create(req, res, next) {
   var contact = itemCreate(contacts, req.body, function (item) {
        addresses[item.id] = [];
   });
   res.send(contacts);
   return
});
server.put('/api/contacts/:id', function (req, res, next) {
    res.send(itemUpdate(contacts, req.body));

});
server.put('/api/contacts', function (req, res, next) {
    res.send(itemUpdate(contacts, req.body));

});
server.get('/api/contacts', function (req, res, next) {
    var offset = req.params.offset || 0,
        count = req.params.count || contacts.length;

    res.send({
        data: contacts.slice(offset, count),
        offset: offset,
        count: count,
        total: contacts.length
    });

});
server.get('/api/contacts/:id', function (req, res, next) {
    var id = parseInt(req.params.id, 10),
        foundContact = getItemById(contacts, id);

    if (foundContact.index !== -1) {
        res.send(foundContact.item);
    } else {
        res.send(404);
    }

});
server.del('/api/contacts/:id', function rm(req, res, next) {
    itemDelete(contacts, req.params.id, function (id) {
        delete addresses[id];
    });
    res.send(204);
});
server.del('/api/contacts', function rm(req, res, next) {
    itemDelete(contacts, req.body.map(function (item) { return item.id; }, function (id) {
        delete addresses[id];
    }));
    res.send(204);
});

server.post('/api/contacts/:id/addresses', function create(req, res, next) {
    res.send(itemCreate(addresses[req.params.id], req.body));
});
server.put('/api/contacts/:id/addresses/:aid', function (req, res, next) {
    res.send(itemUpdate(addresses[req.params.id], req.body));

});
server.put('/api/contacts/:id/addresses', function (req, res, next) {
    res.send(itemUpdate(addresses[req.params.id], req.body));
});
server.get('/api/contacts/:id/addresses', function (req, res, next) {
    var offset = req.params.offset || 0,
        count = req.params.count || contacts.length;

    res.send({
        data: addresses[req.params.id].slice(offset, count),
        offset: offset,
        count: count,
        total: addresses[req.params.id].length
    });
});
server.get('/api/contacts/:id/addresses/:aid', function (req, res, next) {
    var addresses = addresses[req.params.id],
        foundAddress = getItemById(addresses, req.params.aid);
    if (foundAddress.index !== -1) {
        res.send(foundAddress.item);
    } else {
        res.send(404);
    }

});
server.del('/api/contacts/:id/addresses/:aid', function rm(req, res, next) {
    itemDelete(addresses[req.params.id], req.params.aid);
    res.send(204);
});
server.del('/api/contacts/:id/addresses', function rm(req, res, next) {
    itemDelete(addresses[req.params.id], req.body.map(function (item) { return item.id; }));
    res.send(204);
});

server.listen(9001);