var restify = require('restify');

var server = restify.createServer({
  name: 'MyApp'
});

server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());

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
            street: "123 Beaker st",
            city: "New York",
            state: "New York",
            country: "United States"
        }],
        2: [{
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

server.post('api/contacts', function create(req, res, next) {
   var contact = req.body;
   contact.id = getUid();
   addresses[contact.id] = [];
   contacts.push(contact);
   res.send(contact);
   return next();
});
server.put('api/contacts', function (req, res, next) {
    var contact = req.body,
        id = req.params.id,
        foundContact = getItemById(contacts, id);
    if (foundContact.index !== -1) {
        contacts.splice(foundContact.index, 1, contact);
    }
    res.send(contact);
    next();
});
server.get('api/contacts', function (req, res, next) {
    var offset = req.params.offset || 0,
        count = req.params.count || contacts.length;

    res.send({
        data: contacts.slice(offset, count),
        offset: offset,
        count: count,
        total: contacts.length
    });
    next();
});
server.get('api/contacts/:id', function (req, res, next) {
    var id = parseInt(req.params.id, 10),
        foundContact = getItemById(contacts, id);

    if (foundContact.index !== -1) {
        res.send(foundContact.item);
    } else {
        res.send(404);
    }
    next();
});
server.del('api/contacts/:id', function rm(req, res, next) {
    var id = req.params.id,
        foundContact = getItemById(contacts, id);
    if (foundContact.index !== -1) {
        contacts.splice(foundContact.index, 1);
        delete addresses[id];
    }
    res.send(204);
    return next();
});

server.post('api/contacts/:id/addresses', function create(req, res, next) {
   var address = req.body;
   address.id = getUid();
   addresses[req.params.id].push(address);
   res.send(address);
   return next();
});
server.put('api/contacts/:id/addresses/:aid', function (req, res, next) {
    var address = req.body,
        addresses = addresses[req.params.id],
        foundAddress = getItemById(addresses, req.params.aid);
    if (foundAddress.index !== -1) {
        contacts.splice(foundAddress.index, 1, address);
    }
    res.send(address);
    next();
});
server.get('api/contacts/:id/addresses', function (req, res, next) {
    var offset = req.params.offset || 0,
        count = req.params.count || contacts.length;

    res.send({
        data: addresses[req.params.id].slice(offset, count),
        offset: offset,
        count: count,
        total: addresses[req.params.id].length
    });
    next();
});
server.get('api/contacts/:id/addresses/:aid', function (req, res, next) {
    var addresses = addresses[req.params.id],
        foundAddress = getItemById(addresses, req.params.aid);
    if (foundAddress.index !== -1) {
        res.send(foundAddress.item);
    } else {
        res.send(404);
    }
    next();
});
server.del('api/contacts/:id/addresses/:aid', function rm(req, res, next) {
    var addresses = addresses[req.params.id],
        foundAddress = getItemById(addresses, req.params.aid);
    if (foundAddress.index !== -1) {
        addresses.splice(foundAddress.index, 1);
    }
    res.send(204);
    return next();
});

server.listen(9001);