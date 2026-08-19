using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace X1.Haptics
{
    public sealed class X1Client
    {
        private readonly string baseUrl;

        public X1Client(string gatewayUrl = "http://127.0.0.1:4173")
        {
            baseUrl = gatewayUrl.TrimEnd('/');
        }

        public IEnumerator UploadTelemetry(TelemetryFrame frame, Action<string> onSuccess, Action<string> onError)
        {
            yield return Send("/api/sdk/v1/telemetry", "POST", JsonUtility.ToJson(frame), onSuccess, onError);
        }

        public IEnumerator PlayHaptics(string deviceId, HapticCommand command, Action<string> onSuccess, Action<string> onError)
        {
            string path = "/api/sdk/v1/devices/" + UnityWebRequest.EscapeURL(deviceId) + "/haptics";
            yield return Send(path, "POST", JsonUtility.ToJson(command), onSuccess, onError);
        }

        public IEnumerator ListDevices(Action<string> onSuccess, Action<string> onError)
        {
            yield return Send("/api/sdk/v1/devices", "GET", null, onSuccess, onError);
        }

        private IEnumerator Send(string path, string method, string json, Action<string> onSuccess, Action<string> onError)
        {
            using (var request = new UnityWebRequest(baseUrl + path, method))
            {
                request.downloadHandler = new DownloadHandlerBuffer();
                if (json != null)
                {
                    request.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(json));
                    request.SetRequestHeader("Content-Type", "application/json");
                }
                request.timeout = 5;
                yield return request.SendWebRequest();
                if (request.result == UnityWebRequest.Result.Success) onSuccess?.Invoke(request.downloadHandler.text);
                else onError?.Invoke(request.downloadHandler.text ?? request.error);
            }
        }
    }
}
