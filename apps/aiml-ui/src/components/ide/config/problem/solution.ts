export const DEFAULT_PROBLEM_SOLUTION = `

# Solution Article

## Approach 1: Brute Force

### Algorithm

The brute force approach is simple. Loop through each element $x$ and find if there is another value that equals to $target - x$.

### Implementation

\`\`\`c showLineNumbers title="Brute Force Implementation in C" caption="Simple nested loop approach." {2-4} {6-7} {14} /target - nums[i]/
int* twoSum(int* nums, int numsSize, int target, int* returnSize) {
    for (int i = 0; i < numsSize; i++) {
        for (int j = i + 1; j < numsSize; j++) {
            if (nums[j] == target - nums[i]) {
                int* result = malloc(sizeof(int) * 2);
                result[0] = i;
                result[1] = j;
                *returnSize = 2;
                return result;
            }
        }
    }
    // Return an empty array if no solution is found
    *returnSize = 0;
    return malloc(sizeof(int) * 0);
}
\`\`\`

### Complexity Analysis

-   **Time complexity:** $O(n^2)$.

    For each element, we try to find its complement by looping through the rest of the array which takes $O(n)$ time. Therefore, the time complexity is $O(n^2)$.

-   **Space complexity:** $O(1)$.

    The space required does not depend on the size of the input array, so only constant space is used.

---

## Approach 2: Two-pass Hash Table

### Intuition

To improve our runtime complexity, we need a more efficient way to check if the complement exists in the array. If the complement exists, we need to get its index. What is the best way to maintain a mapping of each element in the array to its index? A hash table.

We can reduce the lookup time from $O(n)$ to $O(1)$ by trading space for speed. A hash table is well suited for this purpose because it supports fast lookup in near constant time. I say "near" because if a collision occurred, a lookup could degenerate to $O(n)$ time. However, lookup in a hash table should be amortized $O(1)$ time as long as the hash function was chosen carefully.

### Algorithm

A simple implementation uses two iterations. In the first iteration, we add each element's value as a key and its index as a value to the hash table. Then, in the second iteration, we check if each element's complement ($target - nums[i]$) exists in the hash table. If it does exist, we return current element's index and its complement's index. Beware that the complement must not be $nums[i]$ itself!

### Implementation

\`\`\`c showLineNumbers title="Two-pass Hash Table Implementation in C" caption="Using a hash table for faster lookups." {2-6} {9,15-16,24,26-27} /hashTable/ /HASH_ADD_INT/ /HASH_FIND_INT/ /HASH_DEL/ /HASH_ITER/
int* twoSum(int* nums, int numsSize, int target, int* returnSize) {
    struct hashTable {
        int key;
        int value;
        UT_hash_handle hh;
    } *hashTable = NULL, *item, *tmpItem;

    for (int i = 0; i < numsSize; i++) {
        HASH_FIND_INT(hashTable, &nums[i], item);
        if (item) {
            int* result = malloc(sizeof(int) * 2);
            result[0] = item->value;
            result[1] = i;
            *returnSize = 2;
            HASH_ITER(hh, hashTable, item, tmpItem) {
                HASH_DEL(hashTable, item);
                free(item);
            }
            return result;
        }
        item = malloc(sizeof(struct hashTable));
        item->key = target - nums[i];
        item->value = i;
        HASH_ADD_INT(hashTable, key, item);
    }
    HASH_ITER(hh, hashTable, item, tmpItem) {
        HASH_DEL(hashTable, item);
        free(item);
    }
    *returnSize = 0;
    // If no valid pair is found, return an empty array
    return malloc(sizeof(int) * 0);
}
\`\`\`

### Complexity Analysis

-   **Time complexity:** $O(n)$.

    We traverse the list containing $n$ elements exactly twice. Since the hash table reduces the lookup time to $O(1)$, the overall time complexity is $O(n)$.

-   **Space complexity:** $O(n)$.

    The extra space required depends on the number of items stored in the hash table, which stores exactly $n$ elements.

---

## Approach 3: One-pass Hash Table

### Algorithm

It turns out we can do it in one-pass. While we are iterating and inserting elements into the hash table, we also look back to check if current element's complement already exists in the hash table. If it exists, we have found a solution and return the indices immediately.

### Implementation

\`\`\`c showLineNumbers title="One-pass Hash Table Implementation in C" caption="Efficient single-pass solution." {2-6} {10,16,22,25} /hashTable/ /HASH_ADD_INT/ /HASH_FIND_INT/ /HASH_CLEAR/
int* twoSum(int* nums, int numsSize, int target, int* returnSize) {
    struct hashTable {
        int key;
        int value;
        UT_hash_handle hh;
    } *hashTable = NULL, *item;

    for (int i = 0; i < numsSize; i++) {
        int complement = target - nums[i];
        HASH_FIND_INT(hashTable, &complement, item);
        if (item) {
            int* result = malloc(sizeof(int) * 2);
            result[0] = item->value;
            result[1] = i;
            *returnSize = 2;
            HASH_CLEAR(hh, hashTable);  // Free the hash table
            return result;
        }
        item = malloc(sizeof(struct hashTable));
        item->key = nums[i];
        item->value = i;
        HASH_ADD_INT(hashTable, key, item);
    }
    *returnSize = 0;
    HASH_CLEAR(hh, hashTable);  // Free the hash table
    // Return an empty array if no solution is found
    return malloc(0);  // Allocate 0 bytes
}
\`\`\`

### Complexity Analysis

-   **Time complexity:** $O(n)$.

    We traverse the list containing $n$ elements only once. Each lookup in the table costs only $O(1)$ time.

-   **Space complexity:** $O(n)$.

    The extra space required depends on the number of items stored in the hash table, which stores at most $n$ elements.

---

## Summary of Approaches

| Approach            | Time Complexity | Space Complexity |
| ------------------- | --------------- | ---------------- |
| Brute Force         | $O(n^2)$        | $O(1)$           |
| Two-pass Hash Table | $O(n)$          | $O(n)$           |
| One-pass Hash Table | $O(n)$          | $O(n)$           |

`;
