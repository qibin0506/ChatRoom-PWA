package main

import (
	"net/http"
	"github.com/googlechrome/push-encryption-go/webpush"
	"html/template"
	"encoding/json"
	"io"
	"time"
	"io/ioutil"
)

var serverConfig *Cfg = &Cfg{}
var users map[string]*User = make(map[string]*User)
var mapping map[string]http.HandlerFunc = make(map[string]http.HandlerFunc)

func init() {
	cfg, err := ioutil.ReadFile("./server.cfg")
	if err != nil {
		panic(err)
	}

	err = json.Unmarshal(cfg, serverConfig)
	if err != nil {
		panic(err)
	}
}

func main() {
	http.Handle("/css/", http.StripPrefix("/css/", http.FileServer(http.Dir("./css/"))))
	http.Handle("/images/", http.StripPrefix("/images/", http.FileServer(http.Dir("./images/"))))
	http.Handle("/mdl/", http.StripPrefix("/mdl/", http.FileServer(http.Dir("./mdl/"))))
	http.Handle("/script/", http.StripPrefix("/script/", http.FileServer(http.Dir("./script/"))))

	initHandleFunc()

	http.Handle("/", &Handler{})

	http.ListenAndServeTLS(serverConfig.Addr, serverConfig.CertFile, serverConfig.KeyFile, nil)
}

func initHandleFunc() {
	mapping["/"] = index
	mapping["/send"] = pushMessage
	mapping["/ping"] = ping
	mapping["/user"] = userInfo
	mapping["/reg"] = reg
}

type Handler struct {}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := r.URL.Path
	if serveStatic(path, w, r) {
		return
	}

	servePath(path, w, r)
}

func servePath(path string, w http.ResponseWriter, r *http.Request) {
	for key, value := range mapping {
		if key == path {
			value(w, r)
			return
		}
	}

	mapping["/"](w, r)
}

func serveStatic(path string, w http.ResponseWriter, r *http.Request) bool {
	if path == "/favicon.ico" {
		http.ServeFile(w, r, "./favicon.ico")
		return true
	}

	if path == "/sw.js" {
		http.ServeFile(w, r, "./sw.js")
		return true
	}

	if path == "/manifest.json" {
		http.ServeFile(w, r, "./manifest.json")
		return true
	}

	return false
}

// ping
func ping(w http.ResponseWriter, r *http.Request) {
	sub := r.PostFormValue("sub")
	if user, ok := users[sub]; ok {
		user.LastPingTime = time.Duration(time.Now().Unix())
	}
}

// chatroom index
func index(w http.ResponseWriter, r *http.Request) {
	t := template.Must(template.New("index.html").ParseFiles("./index.html"))
	t.Execute(w, nil)
}

// dispatch message
func pushMessage(w http.ResponseWriter, r *http.Request) {
	content := r.PostFormValue("msg")
	name := r.PostFormValue("name")

	msg := &Message{Name:name, Body:content}
	result, err := json.Marshal(msg)
	if err != nil {
		return
	}

	pushRes := string(result)
	for key, user := range users {
		if time.Duration(time.Now().Unix()) - user.LastPingTime > serverConfig.MaxLifeTime * time.Minute {
			delete(users, key)
			continue
		}

		sub, err := webpush.SubscriptionFromJSON([]byte(key))
		if err != nil {
			println(err.Error())
			continue
		}

		_, err = webpush.Send(nil, sub, pushRes, serverConfig.Token)
		if err != nil {
			println(err.Error())
		}
	}
}

// user info
func userInfo(w http.ResponseWriter, r *http.Request) {
	sub := r.PostFormValue("sub")
	user := findUserBySubscription(sub)

	if user == nil {
		io.WriteString(w, "")
		return
	}

	user.LastPingTime = time.Duration(time.Now().Unix())

	jsonRes, _ := json.Marshal(user)
	io.WriteString(w, string(jsonRes))
}

// reg as user
func reg(w http.ResponseWriter, r *http.Request) {
	sub := r.PostFormValue("sub")
	name := r.PostFormValue("name")

	if user, ok := users[sub]; ok {
		jsonRes, _ := json.Marshal(user)
		io.WriteString(w, string(jsonRes))
		return
	}

	user := &User{Name:name, Sub:sub, LastPingTime: time.Duration(time.Now().Unix())}
	users[sub] = user

	jsonRes, _ := json.Marshal(user)
	io.WriteString(w, string(jsonRes))
}

func findUserBySubscription(sub string) *User {
	if sub == "" {
		return nil
	}

	if user, ok := users[sub]; ok {
		return user
	}

	return nil
}

type Cfg struct {
	MaxLifeTime time.Duration `json:"max_life_time_minute"`
	Addr string `json:"listen_addr"`
	CertFile string `json:"cert_file"`
	KeyFile string `json:"cert_key_file"`
	Token string `json:"token"`
}

type Success struct {
	Ok bool `json:"success"`
	Message string `json:"message"`
}

type User struct {
	Name string `json:"name"`
	Sub string `json:"sub"`
	LastPingTime time.Duration `json:"-"`
}

type Message struct {
	Name string `json:"name"`
	Body string `json:"body"`
}
