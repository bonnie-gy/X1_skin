#include "X1HapticsClient.h"
#include "HttpModule.h"
#include "Interfaces/IHttpRequest.h"
#include "Serialization/JsonSerializer.h"

namespace
{
    void PostJson(const FString& Url, const TSharedRef<FJsonObject>& Body)
    {
        FString Json;
        TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Json);
        FJsonSerializer::Serialize(Body, Writer);
        TSharedRef<IHttpRequest> Request = FHttpModule::Get().CreateRequest();
        Request->SetURL(Url);
        Request->SetVerb(TEXT("POST"));
        Request->SetHeader(TEXT("Content-Type"), TEXT("application/json"));
        Request->SetContentAsString(Json);
        Request->ProcessRequest();
    }

    FString NormalizeBaseUrl(const FString& GatewayUrl)
    {
        FString BaseUrl = GatewayUrl;
        BaseUrl.RemoveFromEnd(TEXT("/"));
        return BaseUrl;
    }
}

void UX1HapticsClient::UploadTelemetry(const FString& GatewayUrl, const FString& DeviceId,
    int32 Sequence, float Pressure, float Stretch, float Motion)
{
    TSharedRef<FJsonObject> Channels = MakeShared<FJsonObject>();
    Channels->SetNumberField(TEXT("pressure"), Pressure);
    Channels->SetNumberField(TEXT("stretch"), Stretch);
    Channels->SetNumberField(TEXT("motion"), Motion);

    TSharedRef<FJsonObject> Body = MakeShared<FJsonObject>();
    Body->SetStringField(TEXT("deviceId"), DeviceId);
    Body->SetNumberField(TEXT("sequence"), Sequence);
    Body->SetObjectField(TEXT("channels"), Channels);
    PostJson(NormalizeBaseUrl(GatewayUrl) + TEXT("/api/sdk/v1/telemetry"), Body);
}

void UX1HapticsClient::PlayHaptics(const FString& GatewayUrl, const FString& DeviceId,
    const TArray<FString>& Zones, const FString& Waveform, float Intensity, int32 DurationMs)
{
    TSharedRef<FJsonObject> Body = MakeShared<FJsonObject>();
    TArray<TSharedPtr<FJsonValue>> ZoneValues;
    for (const FString& Zone : Zones) ZoneValues.Add(MakeShared<FJsonValueString>(Zone));
    Body->SetArrayField(TEXT("zones"), ZoneValues);
    Body->SetStringField(TEXT("waveform"), Waveform);
    Body->SetNumberField(TEXT("intensity"), FMath::Clamp(Intensity, 0.0f, 1.0f));
    Body->SetNumberField(TEXT("durationMs"), DurationMs);
    Body->SetStringField(TEXT("source"), TEXT("unreal"));

    const FString Url = FString::Printf(TEXT("%s/api/sdk/v1/devices/%s/haptics"), *NormalizeBaseUrl(GatewayUrl), *DeviceId);
    PostJson(Url, Body);
}
