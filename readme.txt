
INSTALLATIONS
-------------

https://github.com/ry/node/wiki/Installation
http://howtonode.org/how-to-install-nodejs

curl http://npmjs.org/install.sh | sh

npm install express
npm install ya-csv
npm install jquery
npm install joose joosex-namespace-depended
npm install hash
npm install socket.io

npm install restartr

restartr node server.js


apt-get install build-essential

modinfo ftdi_sio

dmesg | grep tty

apt-get install ttylog
ttylog -b 9600 -d /dev/ttyUSB0


vim ~/.bashrc
export PATH="$HOME/local/node/bin:$PATH"

http://casperfabricius.com/site/2008/09/21/keeping-git-repositories-on-dreamhost-using-ssh/
ssh-keygen -t rsa
cat .ssh/id_rsa.pub | ssh basham@bash.am 'cat >> .ssh/authorized_keys'
ssh-add

git clone ssh://basham@bash.am/~/git/hashcheck.git