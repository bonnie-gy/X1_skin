using UnrealBuildTool;

public class X1Haptics : ModuleRules
{
    public X1Haptics(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
        PublicDependencyModuleNames.AddRange(new[] { "Core", "CoreUObject", "Engine", "HTTP", "Json", "JsonUtilities" });
    }
}
