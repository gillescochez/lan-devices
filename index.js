const ip = require('ip');
const os = require('os');
const net = require('net');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

const getAvailableIPs = () => {
	const interfaces = os.networkInterfaces();
	const result = [];

	for (let key in interfaces) {
		interfaces[key].map((address) => {
			if (address.family === 'IPv4' && !address.internal) {
				const subnet = ip.subnet(address.address, address.netmask);
				const last = ip.toLong(subnet.lastAddress) - 1;
				let current = ip.toLong(subnet.firstAddress);
				while (current++ < last) result.push(ip.fromLong(current))
			}
		});
	}

	return result
};

const ips = getAvailableIPs();

const parsers = {

	windows: (row) => {
		const [ipAddress, macAddress] = row.trim().split(/\s+/);
		let hostname = '?';

		return (!~ips.indexOf(ipAddress) || macAddress === '(incomplete)') ? null : {
			hostname,
			ipAddress,
			macAddress
		};
	},

	linux: (row) => {

		const bits = row.trim().split(/\s+/);
		const hostname = bits[0].trim();
		const ipAddress = bits[1].replace('(', '').replace(')', '');

		let macAddress = bits[3];

		if (!~ips.indexOf(ipAddress) || macAddress === '(incomplete)') return;

		macAddress = macAddress.replace(/^.:/, '0$&')
		.replace(/:.(?=:|$)/g, ':0X$&')
		.replace(/X:/g, '');

		return {
			hostname,
			ipAddress,
			macAddress
		}
	}
};

const parse = ({stdout}) => {

	const isWindows = stdout.indexOf('\r\n') !== -1;
	const RN = stdout.indexOf('\r\n') !== -1 ? '\r\n' : '\n';
	const rows = stdout.split(RN);

	let output = [];
	let parseFn = parsers.linux;

	if (isWindows) {
		// 3 first entries are 2 headers and 1 empty string
		rows.splice(0, 3);

		// Remove the last entry as it's an empty string
		rows.splice(rows.length - 1, 1);
		parseFn = parsers.windows;
	}

	rows.map((row) => {
		const value = parseFn(row);
		value && output.push(value);
	});

	return output;
};

const list = () => {
	return exec('arp -a').then(parse)
};

let pingPort = 80;

const ping = () => {
	return Promise.all(ips.map((address) => {
		return new Promise((resolve) => {
			new net.Socket()
			.setTimeout(1000, close)
			.connect(pingPort, address, close)
			.once('error', close);

			function close() {
				this.destroy();
				resolve(address)
			}
		})
	}))
};

module.exports = {
	ips: () => {
		return ips;
	},
	scan: (port) => {
		pingPort = port || 80;
		return ping().then(list);
	}
};