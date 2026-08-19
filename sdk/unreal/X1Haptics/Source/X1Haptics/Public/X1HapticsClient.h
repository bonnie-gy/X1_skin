#pragma once

#include "CoreMinimal.h"
#include "Kismet/BlueprintFunctionLibrary.h"
#include "X1HapticsClient.generated.h"

UCLASS()
class X1HAPTICS_API UX1HapticsClient : public UBlueprintFunctionLibrary
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable, Category = "X1 Haptics")
    static void UploadTelemetry(
        const FString& GatewayUrl,
        const FString& DeviceId,
        int32 Sequence,
        float Pressure,
        float Stretch,
        float Motion
    );

    UFUNCTION(BlueprintCallable, Category = "X1 Haptics")
    static void PlayHaptics(
        const FString& GatewayUrl,
        const FString& DeviceId,
        const TArray<FString>& Zones,
        const FString& Waveform,
        float Intensity,
        int32 DurationMs
    );
};
