pub fn calculate_referral_split(
    total_reward_stroops: i128,
    referrer_percent: u32,
) -> Result<(i128, i128), &'static str> {
    if referrer_percent > 100 {
        return Err("Referrer percent cannot exceed 100");
    }
    let referrer_amount = total_reward_stroops * referrer_percent as i128 / 100;
    let referee_amount = total_reward_stroops - referrer_amount;
    Ok((referrer_amount, referee_amount))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn split_50_50() {
        assert_eq!(calculate_referral_split(100, 50), Ok((50, 50)));
    }

    #[test]
    fn split_100_0() {
        assert_eq!(calculate_referral_split(100, 100), Ok((100, 0)));
    }

    #[test]
    fn split_0_100() {
        assert_eq!(calculate_referral_split(100, 0), Ok((0, 100)));
    }

    #[test]
    fn split_70_30() {
        assert_eq!(calculate_referral_split(100, 70), Ok((70, 30)));
    }

    #[test]
    fn odd_total_remainder_goes_to_referrer() {
        // 7 * 70 / 100 = 4 (integer), referee = 7 - 4 = 3, sum = 7
        let (r, e) = calculate_referral_split(7, 70).unwrap();
        assert_eq!(r + e, 7);
        assert_eq!(r, 4);
    }

    #[test]
    fn percent_over_100_errors() {
        assert_eq!(
            calculate_referral_split(100, 101),
            Err("Referrer percent cannot exceed 100")
        );
    }
}
