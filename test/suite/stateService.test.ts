import * as assert from 'assert';
import * as vscode from 'vscode';
import { StateService } from '../../src/stateService';

suite('StateService Test Suite', () => {
    let stateService: StateService;

    suiteSetup(async () => {
        const ext = vscode.extensions.getExtension('letitia.md-human-review');
        if (ext && !ext.isActive) {
            await ext.activate();
        }
    });

    setup(() => {
        // 使用 mock workspaceState 创建 StateService
        const mockState = new Map<string, any>();
        const mockContext = {
            workspaceState: {
                get: <T>(key: string): T | undefined => mockState.get(key) as T | undefined,
                update: async (key: string, value: any) => {
                    if (value === undefined) {
                        mockState.delete(key);
                    } else {
                        mockState.set(key, value);
                    }
                }
            }
        } as any as vscode.ExtensionContext;
        stateService = new StateService(mockContext);
    });

    test('get 应返回 undefined（键不存在时）', () => {
        const value = stateService.get<string>('nonexistent-key');
        assert.strictEqual(value, undefined);
    });

    test('set 后 get 应返回正确的值', async () => {
        await stateService.set('test-key', 'hello');
        const value = stateService.get<string>('test-key');
        assert.strictEqual(value, 'hello');
    });

    test('set 应支持存储对象类型', async () => {
        const obj = { name: '测试', count: 42, nested: { a: 1 } };
        await stateService.set('obj-key', obj);
        const value = stateService.get<typeof obj>('obj-key');
        assert.deepStrictEqual(value, obj);
    });

    test('set 应支持存储数组类型', async () => {
        const arr = [1, 2, 3, '四', '五'];
        await stateService.set('arr-key', arr);
        const value = stateService.get<typeof arr>('arr-key');
        assert.deepStrictEqual(value, arr);
    });

    test('set 应支持存储布尔值', async () => {
        await stateService.set('bool-key', true);
        assert.strictEqual(stateService.get<boolean>('bool-key'), true);

        await stateService.set('bool-key', false);
        assert.strictEqual(stateService.get<boolean>('bool-key'), false);
    });

    test('set 应支持存储数字类型', async () => {
        await stateService.set('num-key', 3.14);
        assert.strictEqual(stateService.get<number>('num-key'), 3.14);
    });

    test('set 覆盖已有值应生效', async () => {
        await stateService.set('overwrite-key', 'old');
        assert.strictEqual(stateService.get<string>('overwrite-key'), 'old');

        await stateService.set('overwrite-key', 'new');
        assert.strictEqual(stateService.get<string>('overwrite-key'), 'new');
    });

    test('remove 应删除已存储的值', async () => {
        await stateService.set('remove-key', 'to-be-removed');
        assert.strictEqual(stateService.get<string>('remove-key'), 'to-be-removed');

        await stateService.remove('remove-key');
        assert.strictEqual(stateService.get<string>('remove-key'), undefined);
    });

    test('remove 不存在的键不应报错', async () => {
        await stateService.remove('never-existed-key');
        assert.strictEqual(stateService.get<string>('never-existed-key'), undefined);
    });

    // ===== 补充：并发和边界用例 =====

    suite('并发读写', () => {
        test('并发写入不同键 → 所有值都应正确', async () => {
            const promises = [];
            for (let i = 0; i < 20; i++) {
                promises.push(stateService.set(`concurrent-key-${i}`, `value-${i}`));
            }
            await Promise.all(promises);

            for (let i = 0; i < 20; i++) {
                assert.strictEqual(stateService.get<string>(`concurrent-key-${i}`), `value-${i}`);
            }
        });

        test('并发写入同一键 → 最终值应为最后写入的值之一', async () => {
            const promises = [];
            for (let i = 0; i < 10; i++) {
                promises.push(stateService.set('race-key', `value-${i}`));
            }
            await Promise.all(promises);

            const value = stateService.get<string>('race-key');
            assert.ok(value && value.startsWith('value-'), '值应为 value-N 格式');
        });

        test('并发读写混合 → 不应抛出异常', async () => {
            await stateService.set('mixed-key', 'initial');

            const promises: Promise<any>[] = [];
            for (let i = 0; i < 10; i++) {
                promises.push(stateService.set('mixed-key', `write-${i}`));
                promises.push(Promise.resolve(stateService.get<string>('mixed-key')));
            }

            await assert.doesNotReject(async () => {
                await Promise.all(promises);
            }, '并发读写不应抛出异常');
        });

        test('并发删除和写入 → 不应抛出异常', async () => {
            await stateService.set('del-write-key', 'initial');

            const promises: Promise<any>[] = [];
            for (let i = 0; i < 5; i++) {
                promises.push(stateService.remove('del-write-key'));
                promises.push(stateService.set('del-write-key', `rewrite-${i}`));
            }

            await assert.doesNotReject(async () => {
                await Promise.all(promises);
            }, '并发删除和写入不应抛出异常');
        });
    });

    suite('边界值', () => {
        test('存储 null 值应正常工作', async () => {
            await stateService.set('null-key', null);
            const value = stateService.get('null-key');
            assert.strictEqual(value, null);
        });

        test('存储空字符串应正常工作', async () => {
            await stateService.set('empty-str-key', '');
            const value = stateService.get<string>('empty-str-key');
            assert.strictEqual(value, '');
        });

        test('存储数字 0 应正常工作', async () => {
            await stateService.set('zero-key', 0);
            const value = stateService.get<number>('zero-key');
            assert.strictEqual(value, 0);
        });

        test('存储空对象应正常工作', async () => {
            await stateService.set('empty-obj-key', {});
            const value = stateService.get<object>('empty-obj-key');
            assert.deepStrictEqual(value, {});
        });

        test('存储空数组应正常工作', async () => {
            await stateService.set('empty-arr-key', []);
            const value = stateService.get<any[]>('empty-arr-key');
            assert.deepStrictEqual(value, []);
        });

        test('存储特殊字符键名应正常工作', async () => {
            const specialKeys = [
                'key with spaces',
                'key/with/slashes',
                'key.with.dots',
                'key-with-dashes',
                'key_with_underscores',
                '中文键名',
                'key🎉emoji'
            ];

            for (const key of specialKeys) {
                await stateService.set(key, `value-for-${key}`);
                assert.strictEqual(stateService.get<string>(key), `value-for-${key}`, `键 "${key}" 应正常存取`);
            }
        });

        test('存储深层嵌套对象应正常工作', async () => {
            const deepObj = {
                level1: {
                    level2: {
                        level3: {
                            level4: {
                                value: '深层值'
                            }
                        }
                    }
                }
            };
            await stateService.set('deep-key', deepObj);
            const value = stateService.get<typeof deepObj>('deep-key');
            assert.strictEqual(value!.level1.level2.level3.level4.value, '深层值');
        });

        test('存储大数据量应正常工作', async () => {
            // 生成约 100KB 的 JSON 数据
            const largeArray = Array.from({ length: 1000 }, (_, i) => ({
                id: i,
                name: `item-${i}`,
                description: `这是第 ${i} 个项目的描述，包含一些中文内容用于测试。`
            }));

            await stateService.set('large-data-key', largeArray);
            const value = stateService.get<typeof largeArray>('large-data-key');
            assert.ok(value, '应能读取大数据');
            assert.strictEqual(value!.length, 1000);
            assert.strictEqual(value![0].id, 0);
            assert.strictEqual(value![999].id, 999);
        });

        test('存储含特殊字符的字符串应正常工作', async () => {
            const specialStr = '包含\n换行\t制表符\r回车 和 "引号" 以及 \\反斜杠 的字符串';
            await stateService.set('special-str-key', specialStr);
            const value = stateService.get<string>('special-str-key');
            assert.strictEqual(value, specialStr);
        });

        test('快速连续覆盖同一键 → 最终值正确', async () => {
            for (let i = 0; i < 50; i++) {
                await stateService.set('rapid-key', i);
            }
            assert.strictEqual(stateService.get<number>('rapid-key'), 49);
        });
    });
});
