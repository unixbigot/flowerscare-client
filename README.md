# Flowerscare - a NodeJS BLE client example 

Why the funny name?   There's a Xiaomi bluetooth moisture sensor
called FlowerCare.  I made my own version using ESP32 that supports
multiple probes.  I called it Flowerscare in memory of the character
Crowley from Gaiman & Pratchett's "Good Omens".   Crowley's approach
to encouraging healthy houseplants is Terror: he executes poor
performers and shouts threat at his plants.

This program was written to read information from my 
[Flowerscare](https://github.com/unixbigot/flowerscare) sensor 
but will also work for any Bluetooth low energy device.

## Bluetooth in NodeJS

There's a Bluetooth low energy (BLE) library for node called Noble.
Alas, it' 3 years old and does not work.

You should use the fork `@abandonware/noble` instead.

On Mac, you don't need root permissions (but beware that the OS
aggressively caches device characteristics, so if you are seeing odd
results, reboot your mac).   

On linux you need to run as root, OR give nodejs permission to create
bluetooth sockets by running: `sudo setcap cap_net_raw+eip /usr/local/bin/node`.

## Installation

* Install NodeJS following instructions from https://nodejs.org/
* Download this repository, cd into it, then run `npm install`

## Using this program

* **List devices**

```
./flowerscare.js --list
```

* **Read the characteristics of one device**

```
./flowerscare.js DEVICENAME
```

* **Inspect the detailed characteristics of a device**

```
./flowerscare.js --dump DEVICENAME
```


