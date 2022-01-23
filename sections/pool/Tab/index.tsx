import useSynthetixQueries, { GasPrice } from '@synthetixio/queries';
import Button from 'components/Button';
import GasSelector from 'components/GasSelector';
import { BigNumber, utils } from 'ethers';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { FlexDivCentered } from 'styles/common';
import { DataRow, StyledInput } from '../../staking/components/common';

export interface PoolTabProps {
	action: 'add' | 'remove';
	balance: BigNumber;
	rewardsToClaim: BigNumber;
	allowanceAmount: BigNumber;
	stakedTokens: BigNumber;
	approveFunc?: (amount: BigNumber) => Promise<boolean | undefined>;
	fetchBalances: () => void;
}

export default function PoolTab({
	action,
	balance,
	rewardsToClaim,
	allowanceAmount,
	approveFunc,
	stakedTokens,
	fetchBalances,
}: PoolTabProps) {
	const { t } = useTranslation();
	const [gasPrice, setGasPrice] = useState<GasPrice | undefined>(undefined);
	const [needToApprove, setNeedToApprove] = useState(true);
	const [error, setError] = useState('');
	const [amountToSend, setAmountToSend] = useState('');
	const { useSynthetixTxn } = useSynthetixQueries();
	const txn = useSynthetixTxn(
		'StakingRewardsSNXWETHUniswapV3',
		action === 'add' ? 'stake' : 'withdraw',
		[utils.parseUnits(amountToSend ? amountToSend : '0', 18)],
		gasPrice,
		{
			enabled: utils.parseUnits(amountToSend ? amountToSend : '0', 18).gt(BigNumber.from(0)),
			onSettled: () => {
				fetchBalances();
			},
		}
	);

	const handleTxButton = async () => {
		if (!error) {
			if (needToApprove && approveFunc) {
				approveFunc(utils.parseUnits(amountToSend, 18));
			} else {
				txn.mutate();
			}
		}
	};

	useEffect(() => {
		if (amountToSend) {
			setError('');
			try {
				setNeedToApprove(utils.parseUnits(amountToSend, 18).gt(allowanceAmount));
			} catch (error) {
				setError('Number is too big');
			}
		}
	}, [amountToSend]);

	return (
		<StyledPoolTabWrapper>
			<StyledInputWrapper>
				<StyledInput
					placeholder={utils.formatUnits(action === 'add' ? balance : stakedTokens, 18)}
					type="number"
					onChange={(e) => {
						setAmountToSend(e.target.value || '');
					}}
					value={amountToSend}
				/>
				<StyledMaxButton
					variant="secondary"
					size="sm"
					onClick={() => {
						setAmountToSend(utils.formatUnits(action === 'add' ? balance : stakedTokens, 18));
					}}
				>
					{t('pool.tab.max')}
				</StyledMaxButton>
			</StyledInputWrapper>
			<DataRow>
				<GasSelector
					gasLimitEstimate={txn.gasLimit}
					onGasPriceChange={setGasPrice}
					optimismLayerOneFee={txn.optimismLayerOneFee}
				/>
			</DataRow>
			{action === 'remove' ? (
				<Button variant="primary" size="lg" disabled={!amountToSend} onClick={handleTxButton}>
					{t('pool.tab.unstake')}
				</Button>
			) : (
				<Button
					variant="primary"
					size="lg"
					onClick={handleTxButton}
					disabled={!amountToSend || !!error}
				>
					{!!error ? error : needToApprove ? t('pool.tab.approve') : t('pool.tab.stake')}
				</Button>
			)}

			<StyledButtonWrapper>
				<span>
					{t('pool.tab.reward-balance', { rewards: utils.formatUnits(rewardsToClaim, 18) })}
				</span>
				<Button
					variant="primary"
					size="lg"
					disabled={utils.formatUnits(rewardsToClaim, 18) === '0.0'}
				>
					{t('pool.tab.claim')}
				</Button>
			</StyledButtonWrapper>
		</StyledPoolTabWrapper>
	);
}

const StyledPoolTabWrapper = styled.section`
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	height: 450px;
`;

const StyledButtonWrapper = styled.div`
	margin-top: auto;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	> * {
		margin: 8px;
	}
`;

const StyledInputWrapper = styled(FlexDivCentered)`
	align-items: center;
`;

const StyledMaxButton = styled(Button)`
	margin-top: 16px;
`;
