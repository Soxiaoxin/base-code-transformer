import './App.css';
import { bitable, FieldType, IFieldMeta, ITableMeta, IViewMeta, ViewType } from "@lark-base-open/js-sdk";
import { Button, Form } from '@douyinfe/semi-ui';
import { BaseFormApi } from '@douyinfe/semi-foundation/lib/es/form/interface';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { codePrefixFormats, codeSuffixFormats } from './const';
import { asyncForEach } from './utils';

export default function App() {
  const [tableMetaList, setTableMetaList] = useState<ITableMeta[]>();
  const [viewMetaList, setViewMetaList] = useState<IViewMeta[]>();
  const [fields, setFields] = useState<IFieldMeta[]>();
  const formApi = useRef<BaseFormApi>();
  let currentSuffix: number = 0; // 初始后缀值为0

  const transformCode = useCallback((codePrefix: string, codeFormat: number, codeSuffix: number) => {
    const date = new Date();
    const selectedFormat = codePrefixFormats[codeFormat];
    const formattedDate = formatDate(date, selectedFormat);
    const suffixFormat = codeSuffixFormats[codeSuffix];
    const suffix = generateSuffix(suffixFormat, currentSuffix);

    currentSuffix++; // 递增后缀值

    return `${codePrefix}${formattedDate}${suffix}`;
  }, []);

  function formatDate(date: Date, format: string) {
    const year = date.getFullYear();
    const month = padZero(date.getMonth() + 1);
    const day = padZero(date.getDate());
    const hours = padZero(date.getHours());
    const minutes = padZero(date.getMinutes());
    const seconds = padZero(date.getSeconds());
    const milliseconds = padZero(date.getMilliseconds(), 3);

    return format
        .replace("yyyy", year)
        .replace("MM", month)
        .replace("dd", day)
        .replace("HH", hours)
        .replace("mm", minutes)
        .replace("ss", seconds)
        .replace("SSS", milliseconds);
}

function generateSuffix(suffixFormat: string, suffixValue: number) {
  let suffix = suffixValue + parseInt(suffixFormat); // 根据后缀格式和当前后缀值计算下一个后缀
  return suffix.toString().padStart(suffixFormat.length, '0');
}

function padZero(number: number, length = 2) {
  return number.toString().padStart(length, '0');
}

  /**
   * 表单提交时的回调，这里params有什么取决于下面的form里面有哪些field
   */
  const onSubmit = useCallback(async (params: { table: string, targetView: string, targetField: string, codePrefix: string, codeFormat: number, codeSuffix: number }) => {
    const { table: tableId, targetView: viewId, targetField, codePrefix, codeFormat, codeSuffix } = params;
    // console.log("targetField", targetField);
    if (tableId && viewId) {
      const table = await bitable.base.getTableById(tableId);
      const view = await table.getViewById(viewId);
      const recordIds = await view.getVisibleRecordIdList();
      // console.log("recordIds", recordIds);
      
      await asyncForEach(recordIds, async (recordId) => {
        if (!recordId) {
          // 这一行recordId为undefined
          return;
        }
        const recordValue = await table.getRecordById(recordId);
        // console.log("recordValue", recordValue);
        const formattedText = transformCode(codePrefix, codeFormat, codeSuffix);
        console.log("formattedText", formattedText);
        recordValue.fields[targetField] = {
          type: 'text',
          text: formattedText,
        };
        // console.log("recordValue", recordValue);
        table.setRecord(recordId, recordValue);
      });
      // table.setRecords(records);
      currentSuffix = 0;
    }
  }, []);

  /**
   * 刷新表格对应的字段列表，一般初始化时和table字段改了需要refresh一下
   * 如果需要让用户选择「字段」，才需要这个
   */
  const refreshFieldList = useCallback(async (tableId: string) => {
    const table = await bitable.base.getTableById(tableId);
    if (table) {
      const fieldList = await table.getFieldMetaList();
      // eg. 如果要过滤文本类型的列 ⬇⬇⬇⬇
      const textFields = fieldList.filter(f => f.type === FieldType.Text);
      setFields(textFields);
    }
  }, []);

  /**
   * 刷新表格对应的视图列表，一般初始化时和table字段改了需要refresh一下
   * 如果需要让用户选择「视图」，才需要这个
   */
  const refreshViewList = useCallback(async (tableId: string) => {
    const table = await bitable.base.getTableById(tableId);
    if (table) {
      const viewList = await table.getViewMetaList();
      // eg. 如果要过滤表格视图类型的列 ⬇⬇⬇⬇
      const gridViews = viewList.filter(view => view.type === ViewType.Grid);
      setViewMetaList(gridViews);
    }
  }, []);

  /**
   * 这里可以理解为componentDidMount，即组件挂载完成，可以在这个时候获取数据
   */
  useEffect(() => {
    Promise.all([bitable.base.getTableMetaList(), bitable.base.getSelection()])
      .then(([metaList, selection]) => {
        setTableMetaList(metaList);
        formApi.current?.setValues({ table: selection.tableId, ...formApi.current.getValues() });
        refreshFieldList(selection.tableId || '');
        refreshViewList(selection.tableId || '');
      });
  }, []);

  // 多语言
  const { t } = useTranslation();

  return (
    <main className="main">
      <Form labelPosition='top' onSubmit={onSubmit} getFormApi={(baseFormApi: BaseFormApi) => formApi.current = baseFormApi}>
        {/* 选择表格 */}
        <Form.Select
          field='table'
          label={{ text: t('select_table'), required: true }}
          rules={[
            { required: true, message: t('select_table_placeholder') },
          ]}
          trigger='blur'
          placeholder={t('select_table_placeholder')}
          style={{ width: '100%' }}>
          {
            Array.isArray(tableMetaList) && tableMetaList.map(({ name, id }) => {
              return (
                <Form.Select.Option key={id} value={id}>
                  {name}
                </Form.Select.Option>
              );
            })
          }
        </Form.Select>
        {/* 选择目标视图 */}
        <Form.Select
          label={{ text: t('select_target_view'), required: true }}
          rules={[
            { required: true, message: t('select_target_view_placeholder') },
          ]}
          trigger='blur'
          field='targetView'
          placeholder={t("select_target_view_placeholder")}
          style={{ width: '100%' }}
        >
          {
            Array.isArray(viewMetaList) && viewMetaList.map(({ name, id }) => {
              return (
                <Form.Select.Option key={id} value={id}>
                  {name}
                </Form.Select.Option>
              );
            })
          }
        </Form.Select>
        {/* 选择目标字段 */}
        <Form.Select
          label={{ text: t('select_target_field'), required: true }}
          rules={[
            { required: true, message: t('select_target_field_placeholder') },
          ]}
          trigger='blur'
          field='targetField'
          placeholder={t("select_target_field_placeholder")}
          style={{ width: '100%' }}
        >
          {
            Array.isArray(fields) && fields.map(({ name, id }) => {
              return (
                <Form.Select.Option key={id} value={id}>
                  {name}
                </Form.Select.Option>
              );
            })
          }
        </Form.Select>
        {/* 编码前缀 */}
        <Form.Input
          label={{ text: t('select_code_prefix') }}
          // rules={[
          //   { required: true, message: t('select_code_prefix_placeholder') },
          // ]}
          trigger='blur'
          field='codePrefix'
          placeholder={t("select_code_prefix_placeholder")}
          style={{ width: '100%' }}
        >
        </Form.Input>
        {/* 编码格式 */}
        <Form.Select
          label={{ text: t('select_code_format'), required: true }}
          rules={[
            { required: true, message: t('select_code_format_placeholder') },
          ]}
          trigger='blur'
          field='codeFormat'
          placeholder={t("select_code_format_placeholder")}
          style={{ width: '100%' }}
        >
          {
            codePrefixFormats.map((name, index) => {
              return (
                <Form.Select.Option key={index} value={index}>
                  {name}
                </Form.Select.Option>
              );
            })
          }
        </Form.Select>
        {/* 编码尾缀 */}
        <Form.Select
          label={{ text: t('select_code_suffix'), required: true }}
          rules={[
            { required: true, message: t('select_code_suffix_placeholder') },
          ]}
          trigger='blur'
          field='codeSuffix'
          placeholder={t("select_code_suffix_placeholder")}
          style={{ width: '100%' }}
        >
          {
            codeSuffixFormats.map((name, index) => {
              return (
                <Form.Select.Option key={index} value={index}>
                  {name}
                </Form.Select.Option>
              );
            })
          }
        </Form.Select>
        {/* 确认按钮，点击之后会触发 form 的 onsubmit */}
        <Button theme='solid' htmlType='submit'>{t('submit_button')}</Button>
      </Form>
    </main>
  )
}


