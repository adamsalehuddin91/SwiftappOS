
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { Quotation } from '@/types';

// Register fonts if needed, creating a standard style
const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 30,
        fontFamily: 'Helvetica',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 40,
        borderBottomWidth: 1,
        borderBottomColor: '#112233',
        paddingBottom: 20,
    },
    companyDetails: {
        fontSize: 10,
        color: '#333',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#112233',
        marginBottom: 5,
    },
    subTitle: {
        fontSize: 12,
        color: '#666',
    },
    clientSection: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#444',
    },
    table: {
        display: "flex",
        width: "auto",
        borderStyle: "solid",
        borderColor: "#bfbfbf",
        borderWidth: 1,
        borderRightWidth: 0,
        borderBottomWidth: 0,
        marginBottom: 20,
    },
    tableRow: {
        margin: "auto",
        flexDirection: "row",
    },
    tableColHeader: {
        width: "50%",
        borderStyle: "solid",
        borderColor: "#bfbfbf",
        borderBottomColor: "#000",
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        backgroundColor: "#f0f0f0",
    },
    tableColHeaderSm: {
        width: "15%",
        borderStyle: "solid",
        borderColor: "#bfbfbf",
        borderBottomColor: "#000",
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        backgroundColor: "#f0f0f0",
    },
    tableColHeaderMd: {
        width: "20%",
        borderStyle: "solid",
        borderColor: "#bfbfbf",
        borderBottomColor: "#000",
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
        backgroundColor: "#f0f0f0",
    },
    tableCol: {
        width: "50%",
        borderStyle: "solid",
        borderColor: "#bfbfbf",
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
    },
    tableColSm: {
        width: "15%",
        borderStyle: "solid",
        borderColor: "#bfbfbf",
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
    },
    tableColMd: {
        width: "20%",
        borderStyle: "solid",
        borderColor: "#bfbfbf",
        borderWidth: 1,
        borderLeftWidth: 0,
        borderTopWidth: 0,
    },
    tableCellHeader: {
        margin: 5,
        fontSize: 10,
        fontWeight: 'bold',
    },
    tableCell: {
        margin: 5,
        fontSize: 10,
    },
    totalSection: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 10,
    },
    totalText: {
        fontSize: 14,
        fontWeight: 'bold',
    }
});

interface PdfProps {
    type: 'Quotation' | 'Invoice';
    data: any; // Type properly later
}

export const PdfDocument = ({ type, data }: PdfProps) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>{type.toUpperCase()}</Text>
                    <Text style={styles.subTitle}>#{data.number}</Text>
                </View>
                <View style={styles.companyDetails}>
                    <Text style={{ fontWeight: 'bold', fontSize: 12 }}>SwiftApp Ecosystem</Text>
                    <Text>123 Tech Street, Cyberjaya</Text>
                    <Text>Selangor, Malaysia</Text>
                    <Text>admin@swiftapp.com</Text>
                </View>
            </View>

            <View style={styles.clientSection}>
                <Text style={styles.sectionTitle}>Bill To:</Text>
                <Text style={{ fontSize: 11 }}>{data.clientName}</Text>
                <Text style={{ fontSize: 11 }}>{data.clientEmail}</Text>
            </View>

            <View style={styles.table}>
                <View style={styles.tableRow}>
                    <View style={styles.tableColHeader}>
                        <Text style={styles.tableCellHeader}>Description</Text>
                    </View>
                    <View style={styles.tableColHeaderSm}>
                        <Text style={styles.tableCellHeader}>Qty</Text>
                    </View>
                    <View style={styles.tableColHeaderMd}>
                        <Text style={styles.tableCellHeader}>Unit Price</Text>
                    </View>
                    <View style={styles.tableColHeaderSm}>
                        <Text style={styles.tableCellHeader}>Total</Text>
                    </View>
                </View>

                {data.items.map((item: any, i: number) => (
                    <View style={styles.tableRow} key={i}>
                        <View style={styles.tableCol}>
                            <Text style={styles.tableCell}>{item.description}</Text>
                        </View>
                        <View style={styles.tableColSm}>
                            <Text style={styles.tableCell}>{item.quantity}</Text>
                        </View>
                        <View style={styles.tableColMd}>
                            <Text style={styles.tableCell}>{item.unitPrice.toLocaleString()}</Text>
                        </View>
                        <View style={styles.tableColSm}>
                            <Text style={styles.tableCell}>{(item.quantity * item.unitPrice).toLocaleString()}</Text>
                        </View>
                    </View>
                ))}
            </View>

            <View style={styles.totalSection}>
                <Text style={styles.totalText}>Total: RM {data.total.toLocaleString()}</Text>
            </View>

            <View style={{ marginTop: 50 }}>
                <Text style={styles.sectionTitle}>Notes / Terms:</Text>
                <Text style={{ fontSize: 10, color: '#555' }}>{data.notes}</Text>
            </View>
        </Page>
    </Document>
);
