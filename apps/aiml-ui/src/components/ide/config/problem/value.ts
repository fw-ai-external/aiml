import { EditorLanguage } from "@/types/editor-language";

export const TEMP_DEFAULT_EDITOR_VALUE: Record<EditorLanguage, string> = {
    [EditorLanguage.C]: `/**
 * Note: The returned array must be malloced, assume caller calls free().
 */
int* twoSum(int* nums, int numsSize, int target, int* returnSize) {
    
}`,
    [EditorLanguage.CPP]: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        
    }
};`,
};
