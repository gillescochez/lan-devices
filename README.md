# lan-devices

Simple util to scan devices connected to the local network (with Windows support)

Returns the list as an array of object in the following format

```
{
   name: '?', // if unknow ? is used
   ipAddress: '127.0.0.1',
   macAddress: '00:00:0f:9f:00:4f'
}
```

## Usage

Getting the list

```

const { scan } = require('lan-devices');
scan().then((list) => {
    console.log(list);
});

```

Accessing internal array of available IPs (inc. disconnected IPs)

```

const { ips } = require('lan-devices');
console.log(ips());

```


## Todo

Add hostname lookup for Windows OS