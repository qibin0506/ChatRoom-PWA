# ChatRoom-PWA
A ChatRoom by Progressive Web App

## 搭建聊天室服务器
1. 打开/sw.js文件和/script/main.js, 将**baseUrl**修改成为你的服务器地址.
2. 打开/server.cfg文件, 将**listen_addr**修改成你的地址
3. 打开/server.cfg文件, 将**cert_file**修改成你的证书文件绝对路径
4. 打开/server.cfg文件, 将**cert_key_file**修改成你的证书密钥文件绝对路径
5. 打开/server.cfg文件, 将**token**修改成你的服务器密钥

完成配置后, 运行
> nohup ./server &
