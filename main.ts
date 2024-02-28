import axios, { AxiosInstance } from "axios";
import { EventEmitter } from "events";
import WebSocket from "ws";

const configFiles = require("./config.json");

process.env.TZ = "Europe/Paris";

interface discord_event {
  t: string;
  s: number;
  op: number;
  d: Object;
}

class DiscordClient extends EventEmitter {
  private token: string;
  private headers;
  private ws: WebSocket;
  private is_authenticated: boolean = false;
  private heartbeat_interval: number = 4125;

  constructor(token: string) {
    super();
    this.token = token;
    this.ws = new WebSocket("wss://gateway.discord.gg/?v=9&encoding=json");
    this.headers = {
      authority: "discord.com",
      authorization: token,
      "content-type": "application/json",
    };

    this.init_connection();
    this.startHeartbeat();
    this.display_time_as_status();
  }

  init_connection() {
    this.ws = new WebSocket("wss://gateway.discord.gg/?v=9&encoding=json");
    // Handle the WebSocket open event
    this.ws.onopen = () => {
      this.emit("open");
      this.authentication();
    };

    // Handle the WebSocket close event
    this.ws.onclose = () => {
      this.emit("close");

      setTimeout(() => {
        this.init_connection();
      }, 1000);
    };
  }

  startHeartbeat() {
    const sendHeartbeat = () => {
      let keep_alive_opcode = Buffer.from(JSON.stringify({ op: 1, d: null }));
      this.ws.send(keep_alive_opcode);
      //console.log("heartbeat sent");
    };
    setInterval(sendHeartbeat, this.heartbeat_interval * 10); //to be replaced by this.hearbeat_intervals * 1000
  }

  authentication() {
    //Authentication
    this.ws.send(
      JSON.stringify({
        op: 2,
        d: {
          token: this.token,
          capabilities: 16381,
          properties: {
            os: "Linux",
            browser: "Chrome",
            device: "",
          },
          presence: {
            status: "online",
            since: 0,
            activities: [],
            afk: "false",
          },
          compress: "false",
        },
      })
    );
  }

  async display_time_as_status() {
    const sendHour = () => {
      const currentDate = new Date();

      // Format the date and time, including seconds
      const formattedDate = currentDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });

      const formattedTime = currentDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });

      const dateTimeString = `${formattedDate} ${formattedTime}`;

      this.ws.send(
        JSON.stringify({
          op: 3,
          d: {
            status: "online",
            since: 0,
            activities: [
              {
                name: "Custom Status",
                type: 4,
                state: `${formattedTime} - ${formattedDate} - Paris (UTC+1) `,
                timestamps: {
                  end: 1702076400000,
                },
                emoji: {
                  id: null,
                  name: "⏲️",
                  animated: false,
                },
              },
            ],
            afk: false,
          },
        })
      );
    };

    setInterval(sendHour, 2000);
  }
}

const token = configFiles.token;
const client = new DiscordClient(configFiles.token);
